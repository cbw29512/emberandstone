// scripts/lib/video-render-policy.mjs
// Purpose: Load the review-video cadence policy.
// Why: We want a stable source of truth for how often visuals should change.

import fs from "node:fs/promises";
import path from "node:path";

function fail(message) {
  throw new Error(message);
}

function stripBom(text) {
  return text.replace(/^\uFEFF/, "");
}

export async function readVideoRenderPolicy(rootDir) {
  const filePath = path.join(rootDir, "content", "video-render-policy.json");
  const raw = await fs.readFile(filePath, "utf8");
  const data = JSON.parse(stripBom(raw));

  if (typeof data.target_seconds_per_image !== "number" || data.target_seconds_per_image <= 0) {
    fail("video-render-policy.json missing valid target_seconds_per_image.");
  }

  if (typeof data.minimum_seconds_per_image !== "number" || data.minimum_seconds_per_image <= 0) {
    fail("video-render-policy.json missing valid minimum_seconds_per_image.");
  }

  if (typeof data.maximum_seconds_per_image !== "number" || data.maximum_seconds_per_image <= 0) {
    fail("video-render-policy.json missing valid maximum_seconds_per_image.");
  }

  if (typeof data.repeat_images_to_fill_audio !== "boolean") {
    fail("video-render-policy.json missing valid repeat_images_to_fill_audio.");
  }

  return data;
}