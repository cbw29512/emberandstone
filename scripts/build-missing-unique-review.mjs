// scripts/build-missing-unique-review.mjs
// Purpose: Build a human review page for newly generated missing-unique images.
// Why: New images must be visually approved before merging into final video assets.

import fs from "node:fs/promises";
import path from "node:path";

const ROOT_DIR = process.cwd();
const IMAGE_ROOT = path.join(ROOT_DIR, "output", "images", "missing-unique");
const REVIEW_ROOT = path.join(ROOT_DIR, "output", "review", "missing-unique-review");
const REVIEW_HTML = path.join(REVIEW_ROOT, "index.html");
const REVIEW_JSON = path.join(REVIEW_ROOT, "missing-unique-review.json");

function logInfo(message) {
  console.log("[INFO] " + message);
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonIfExists(filePath) {
  if (!(await pathExists(filePath))) {
    return null;
  }

  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw.replace(/^\uFEFF/, ""));
}

function htmlEscape(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function labelSortValue(fileName) {
  const match = fileName.match(/scene-extra-(\d+)\.jpg$/);

  if (!match) {
    return 999;
  }

  return Number(match[1]);
}

async function collectReviewItems() {
  if (!(await pathExists(IMAGE_ROOT))) {
    throw new Error("Missing generated image folder: " + IMAGE_ROOT);
  }

  const topicEntries = await fs.readdir(IMAGE_ROOT, { withFileTypes: true });
  const items = [];

  for (const topicEntry of topicEntries) {
    if (!topicEntry.isDirectory()) {
      continue;
    }

    const topicId = topicEntry.name;
    const topicDir = path.join(IMAGE_ROOT, topicId);
    const files = await fs.readdir(topicDir);

    const imageFiles = files
      .filter((file) => file.endsWith(".jpg"))
      .sort((a, b) => labelSortValue(a) - labelSortValue(b));

    for (const imageFileName of imageFiles) {
      const label = imageFileName.replace(/\.jpg$/, "");
      const imageFile = path.join(topicDir, imageFileName);
      const manifestFile = path.join(topicDir, label + "-manifest.json");
      const manifest = await readJsonIfExists(manifestFile);
      const reviewSrc = path.relative(REVIEW_ROOT, imageFile).replaceAll("\\", "/");

      items.push({
        topic_id: topicId,
        label,
        image_file: imageFile,
        manifest_file: manifestFile,
        review_image_src: reviewSrc,
        source_scene_number: manifest?.source_scene_number || null,
        source_scene_title: manifest?.source_scene_title || "",
        planned_slot_number: manifest?.planned_slot_number || null,
        status: "pending_human_review"
      });
    }
  }

  return items;
}

function buildCard(item) {
  const title = htmlEscape(item.topic_id + " / " + item.label);
  const src = htmlEscape(item.review_image_src);
  const sceneTitle = htmlEscape(item.source_scene_title || "Unknown source scene");
  const plannedSlot = htmlEscape(item.planned_slot_number || "");
  const sourceScene = htmlEscape(item.source_scene_number || "");

  return [
    '<article class="card">',
    "<h2>" + title + "</h2>",
    '<a href="' + src + '" target="_blank">',
    '<img src="' + src + '" alt="' + title + '">',
    "</a>",
    '<p><strong>Status:</strong> pending human review</p>',
    '<p><strong>Planned slot:</strong> ' + plannedSlot + '</p>',
    '<p><strong>Source scene:</strong> ' + sourceScene + '</p>',
    '<p><strong>Source title:</strong> ' + sceneTitle + '</p>',
    '<p class="decision"><strong>Decision:</strong> KEEP / MAYBE / REJECT</p>',
    "</article>"
  ].join("\n");
}

function buildHtml(items) {
  const cards = items.map(buildCard).join("\n");

  return [
    "<!doctype html>",
    "<html>",
    "<head>",
    '<meta charset="utf-8">',
    "<title>Ember & Stone Missing Unique Image Review</title>",
    "<style>",
    "body { margin: 24px; font-family: Arial, sans-serif; background: #111; color: #eee; }",
    "h1 { margin-bottom: 8px; }",
    ".summary { color: #bbb; margin-bottom: 22px; line-height: 1.4; }",
    ".grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 18px; }",
    ".card { background: #1b1b1b; border: 1px solid #333; border-radius: 14px; padding: 14px; }",
    ".card h2 { font-size: 16px; margin: 0 0 10px; }",
    ".card img { width: 100%; border-radius: 10px; border: 1px solid #333; display: block; }",
    ".card p { color: #ccc; font-size: 13px; margin: 8px 0; }",
    ".decision { color: #fff !important; background: #242424; padding: 8px; border-radius: 8px; }",
    "</style>",
    "</head>",
    "<body>",
    "<h1>Ember & Stone Missing Unique Image Review</h1>",
    '<p class="summary">Review the newly generated images before merging them into final video assets. Mark each image mentally as KEEP, MAYBE, or REJECT. Do not upload publicly until approved images are merged and the full video is re-rendered.</p>',
    '<section class="grid">',
    cards,
    "</section>",
    "</body>",
    "</html>"
  ].join("\n");
}

async function main() {
  try {
    logInfo("Building missing unique image review page...");

    await fs.mkdir(REVIEW_ROOT, { recursive: true });

    const items = await collectReviewItems();

    if (items.length === 0) {
      throw new Error("No missing unique JPG images found.");
    }

    await fs.writeFile(REVIEW_JSON, JSON.stringify({
      created_at: new Date().toISOString(),
      image_count: items.length,
      status: "pending_human_review",
      items
    }, null, 2));

    await fs.writeFile(REVIEW_HTML, buildHtml(items));

    logInfo("Review image count: " + items.length);
    logInfo("Saved review JSON: " + REVIEW_JSON);
    logInfo("Saved review HTML: " + REVIEW_HTML);
  } catch (error) {
    console.error("[ERROR] Missing unique review failed: " + error.message);
    process.exitCode = 1;
  }
}

await main();
