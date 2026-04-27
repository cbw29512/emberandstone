// scripts/verify-youtube-channel.mjs
// Purpose: Verify the local OAuth token is connected to the correct YouTube channel.
// Why: Uploads must never go to the wrong channel.

import fs from "node:fs/promises";
import path from "node:path";

const ROOT_DIR = process.cwd();
const TOKEN_PATH = path.join(ROOT_DIR, "secrets", "youtube", "token.json");
const POLICY_PATH = path.join(ROOT_DIR, "content", "youtube-upload-policy.json");

function fail(message) {
  throw new Error(message);
}

function stripBom(value) {
  return String(value || "").replace(/^\uFEFF/, "");
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(stripBom(raw));
}

async function main() {
  try {
    const policy = await readJson(POLICY_PATH);
    const token = await readJson(TOKEN_PATH);

    if (!policy.expected_channel_id) {
      fail("youtube-upload-policy.json missing expected_channel_id.");
    }

    if (!token.access_token) {
      fail("token.json missing access_token.");
    }

    const url = "https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true";

    const response = await fetch(url, {
      method: "GET",
      headers: {
        authorization: "Bearer " + token.access_token,
        accept: "application/json"
      }
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (!response.ok) {
      fail("YouTube channel lookup failed with " + response.status + ": " + text);
    }

    if (!Array.isArray(data.items) || data.items.length === 0) {
      fail("No authenticated YouTube channels returned.");
    }

    console.log("[INFO] Authenticated YouTube channels:");

    for (const item of data.items) {
      console.log("[INFO] Title: " + item.snippet?.title);
      console.log("[INFO] Channel ID: " + item.id);
    }

    const matched = data.items.some((item) => item.id === policy.expected_channel_id);

    console.log("[INFO] Expected channel name: " + policy.expected_channel_name);
    console.log("[INFO] Expected channel ID: " + policy.expected_channel_id);

    if (!matched) {
      fail("Authenticated channel does not match Ember & Stone. Delete token.json and rerun auth:youtube.");
    }

    console.log("[PASS] YouTube channel verification passed.");
  } catch (error) {
    console.error("[FAIL] YouTube channel verification failed: " + error.message);
    process.exitCode = 1;
  }
}

await main();
