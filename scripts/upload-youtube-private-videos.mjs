// scripts/upload-youtube-private-videos.mjs
// Uploads rendered videos to YouTube as PRIVATE review drafts.

import path from "node:path";
import { fail, logInfo, logWarn, pathExists, readJson, writeJson } from "./lib/youtube/common.mjs";
import { loadFreshToken } from "./lib/youtube/auth-token.mjs";
import { loadUploadPackages } from "./lib/youtube/upload-packages.mjs";
import { uploadVideoMultipart } from "./lib/youtube/upload-client.mjs";

const ROOT_DIR = process.cwd();
const PATHS = {
  secretPath: path.join(ROOT_DIR, "secrets", "youtube", "client_secret.json"),
  tokenPath: path.join(ROOT_DIR, "secrets", "youtube", "token.json"),
  packageRoot: path.join(ROOT_DIR, "output", "youtube-upload-packages"),
  resultRoot: path.join(ROOT_DIR, "output", "youtube-upload-results")
};

const LEDGER_PATH = path.join(PATHS.resultRoot, "private-upload-ledger.json");

async function loadLedger() {
  if (!(await pathExists(LEDGER_PATH))) {
    return { created_at: new Date().toISOString(), uploads: [] };
  }

  return readJson(LEDGER_PATH);
}

function ledgerHasSuccess(ledger, topicId) {
  return Array.isArray(ledger.uploads)
    && ledger.uploads.some((item) => item.topic_id === topicId && item.status === "uploaded_private");
}

async function saveLedger(ledger) {
  ledger.updated_at = new Date().toISOString();
  await writeJson(LEDGER_PATH, ledger);
}

async function uploadOne(accessToken, uploadPackage, ledger) {
  if (!(await pathExists(uploadPackage.video_file))) {
    fail("Video file missing: " + uploadPackage.video_file);
  }

  if (ledgerHasSuccess(ledger, uploadPackage.topic_id) && process.env.FORCE_YOUTUBE_UPLOAD !== "1") {
    logWarn("Skipping already uploaded topic: " + uploadPackage.topic_id);
    return null;
  }

  logInfo("Uploading PRIVATE review draft: " + uploadPackage.topic_id);

  const result = await uploadVideoMultipart(accessToken, uploadPackage);
  const record = buildUploadRecord(uploadPackage, result);

  ledger.uploads = Array.isArray(ledger.uploads) ? ledger.uploads : [];
  ledger.uploads.push(record);

  await saveLedger(ledger);
  await writeJson(path.join(PATHS.resultRoot, uploadPackage.topic_id + ".youtube-upload-result.json"), record);

  logInfo("Uploaded PRIVATE video id: " + result.id);
  logInfo("Studio URL: " + record.youtube_studio_url);

  return record;
}

function buildUploadRecord(uploadPackage, result) {
  return {
    topic_id: uploadPackage.topic_id,
    status: "uploaded_private",
    privacy_status: "private",
    video_id: result.id,
    youtube_watch_url: "https://www.youtube.com/watch?v=" + result.id,
    youtube_studio_url: "https://studio.youtube.com/video/" + result.id + "/edit",
    title: uploadPackage.snippet.title,
    video_file: uploadPackage.video_file,
    uploaded_at: new Date().toISOString(),
    raw_response: result
  };
}

async function main() {
  try {
    logInfo("Starting private YouTube review uploads.");
    logInfo("No secrets or token values will be printed.");

    const token = await loadFreshToken(PATHS);
    const packages = await loadUploadPackages(PATHS.packageRoot);
    const ledger = await loadLedger();
    const uploaded = [];

    for (const uploadPackage of packages) {
      const record = await uploadOne(token.access_token, uploadPackage, ledger);
      if (record) uploaded.push(record);
    }

    logInfo("Private upload run complete.");
    logInfo("New uploads this run: " + uploaded.length);

    for (const item of uploaded) {
      console.log("[PRIVATE] " + item.topic_id + " -> " + item.youtube_studio_url);
    }
  } catch (error) {
    console.error("[ERROR] Private YouTube upload failed: " + error.message);
    process.exitCode = 1;
  }
}

await main();