// scripts/lib/youtube/upload-packages.mjs
// Loads and validates private YouTube upload packages.

import fs from "node:fs/promises";
import path from "node:path";
import { fail, pathExists, readJson } from "./common.mjs";

export async function loadUploadPackages(packageRoot) {
  if (!(await pathExists(packageRoot))) {
    fail("Missing upload package folder: " + packageRoot);
  }

  const files = await fs.readdir(packageRoot);
  const packageFiles = files
    .filter((file) => file.endsWith(".youtube-upload.json"))
    .sort();

  if (packageFiles.length === 0) {
    fail("No .youtube-upload.json package files found.");
  }

  const packages = [];

  for (const file of packageFiles) {
    const packagePath = path.join(packageRoot, file);
    const uploadPackage = await readJson(packagePath);
    uploadPackage.package_file = packagePath;
    validatePrivatePackage(uploadPackage);
    packages.push(uploadPackage);
  }

  return packages;
}

function validatePrivatePackage(uploadPackage) {
  const topic = uploadPackage.topic_id || "unknown-topic";

  if (!uploadPackage.topic_id) fail("Upload package missing topic_id.");
  if (!uploadPackage.video_file) fail(topic + " missing video_file.");

  if (uploadPackage.privacy_status !== "private") {
    fail(topic + " package privacy_status is not private.");
  }

  if (uploadPackage.public_publish_requires_manual_approval !== true) {
    fail(topic + " does not require manual approval before public publishing.");
  }

  if (!uploadPackage.status_payload || uploadPackage.status_payload.privacyStatus !== "private") {
    fail(topic + " status_payload privacyStatus is not private.");
  }

  if (!uploadPackage.snippet?.title) fail(topic + " snippet missing title.");
  if (!uploadPackage.snippet?.description) fail(topic + " snippet missing description.");
  if (!uploadPackage.snippet?.categoryId) fail(topic + " snippet missing categoryId.");
}