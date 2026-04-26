// scripts/build-youtube-private-upload-package.mjs
// Purpose: Build private-review YouTube upload manifests from rendered MP4s.
// Why: Upload automation must default to private so the user can review before publishing.

import fs from "node:fs/promises";
import path from "node:path";

const ROOT_DIR = process.cwd();
const POLICY_PATH = path.join(ROOT_DIR, "content", "youtube-upload-policy.json");
const VIDEO_ROOT = path.join(ROOT_DIR, "output", "videos", "review");
const OUTPUT_ROOT = path.join(ROOT_DIR, "output", "youtube-upload-packages");

function logInfo(message) {
  console.log("[INFO] " + message);
}

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

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function titleFromTopic(topicId) {
  return topicId
    .split("-")
    .filter(Boolean)
    .map((word) => word.slice(0, 1).toUpperCase() + word.slice(1))
    .join(" ");
}

function buildDescription(title) {
  return [
    title,
    "",
    "A dark fantasy lore tale from Ember & Stone.",
    "",
    "Uploaded as a private review draft first. Public release requires manual approval.",
    "",
    "For dungeon masters, storytellers, dark fantasy fans, and TTRPG worldbuilders looking for eerie mythic inspiration.",
    "",
    "#darkfantasy #fantasylore #ttrpg"
  ].join("\n");
}

async function collectRenderedVideos() {
  if (!(await pathExists(VIDEO_ROOT))) {
    fail("Missing rendered review video folder: " + VIDEO_ROOT);
  }

  const topicEntries = await fs.readdir(VIDEO_ROOT, { withFileTypes: true });
  const videos = [];

  for (const entry of topicEntries) {
    if (!entry.isDirectory()) continue;

    const topicId = entry.name;
    const videoFile = path.join(VIDEO_ROOT, topicId, topicId + ".mp4");

    if (!(await pathExists(videoFile))) {
      fail("Expected rendered video is missing: " + videoFile);
    }

    const stat = await fs.stat(videoFile);

    videos.push({
      topic_id: topicId,
      video_file: videoFile,
      size_bytes: stat.size
    });
  }

  if (videos.length === 0) {
    fail("No rendered review videos found.");
  }

  return videos;
}

function validatePolicy(policy) {
  if (policy.default_privacy_status !== "private") {
    fail("YouTube upload policy must default to private.");
  }

  if (policy.public_publish_requires_manual_approval !== true) {
    fail("YouTube policy must require manual approval before public publishing.");
  }

  if (!Array.isArray(policy.default_tags) || policy.default_tags.length === 0) {
    fail("YouTube policy must include default tags.");
  }
}

async function main() {
  try {
    const policy = await readJson(POLICY_PATH);
    validatePolicy(policy);

    const videos = await collectRenderedVideos();
    await fs.mkdir(OUTPUT_ROOT, { recursive: true });

    const packages = [];

    for (const video of videos) {
      const title = titleFromTopic(video.topic_id) + " | Dark Fantasy Lore | Ember & Stone";
      const uploadPackage = {
        topic_id: video.topic_id,
        status: "ready_for_private_review_upload",
        video_file: video.video_file,
        video_size_bytes: video.size_bytes,
        privacy_status: "private",
        public_publish_requires_manual_approval: true,
        snippet: {
          title,
          description: buildDescription(title),
          tags: policy.default_tags,
          categoryId: policy.category_id
        },
        status_payload: {
          privacyStatus: "private",
          selfDeclaredMadeForKids: policy.made_for_kids
        },
        review_notes: [
          "Upload as private only.",
          "User watches YouTube private draft.",
          "If good, user manually publishes or schedules.",
          "If bad, revise locally and upload a new private review version."
        ],
        created_at: new Date().toISOString()
      };

      const packagePath = path.join(OUTPUT_ROOT, video.topic_id + ".youtube-upload.json");
      await fs.writeFile(packagePath, JSON.stringify(uploadPackage, null, 2));

      packages.push({
        topic_id: video.topic_id,
        package_file: packagePath,
        video_file: video.video_file,
        privacy_status: "private"
      });

      logInfo("Built private upload package: " + packagePath);
    }

    const indexPath = path.join(OUTPUT_ROOT, "youtube-private-upload-index.json");
    await fs.writeFile(indexPath, JSON.stringify({
      status: "ready_for_private_review_upload",
      package_count: packages.length,
      public_publish_requires_manual_approval: true,
      packages
    }, null, 2));

    logInfo("Private upload package count: " + packages.length);
    logInfo("Saved index: " + indexPath);
  } catch (error) {
    console.error("[ERROR] YouTube private upload package build failed: " + error.message);
    process.exitCode = 1;
  }
}

await main();
