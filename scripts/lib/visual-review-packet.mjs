// scripts/lib/visual-review-packet.mjs
// Purpose: Build data and HTML for final image human review.
// Why: Video assembly should not start until every final image passes visual QA.

import fs from "node:fs/promises";
import path from "node:path";

function labelSortValue(label) {
  if (label === "thumbnail") return 0;
  const match = label.match(/^scene-(\d+)$/);
  return match ? Number(match[1]) : 999;
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function htmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildReviewItem(finalRoot, reviewRoot, topicId, file) {
  const label = file.replace(/\.jpg$/, "");
  const absolutePath = path.join(finalRoot, topicId, file);
  const imageSrc = path.relative(reviewRoot, absolutePath).replaceAll("\\", "/");

  return {
    topic_id: topicId,
    label,
    image_file: absolutePath,
    review_image_src: imageSrc,
    status: "pending_human_review",
    must_check: [
      "matches intended script beat",
      "belongs visually to Ember & Stone",
      "production-grade composition",
      "no text, logo, watermark, signature, or stamp artifact",
      "no modern or off-style drift",
      "strong enough for a long-form dark fantasy lore video"
    ],
    reviewer_notes: ""
  };
}

export async function collectFinalImages(finalRoot, reviewRoot) {
  if (!(await pathExists(finalRoot))) {
    throw new Error("Missing final image folder: " + finalRoot);
  }

  const topicEntries = await fs.readdir(finalRoot, { withFileTypes: true });
  const items = [];

  for (const topicEntry of topicEntries) {
    if (!topicEntry.isDirectory()) continue;

    const topicId = topicEntry.name;
    const topicDir = path.join(finalRoot, topicId);
    const files = await fs.readdir(topicDir);

    for (const file of files) {
      if (file.endsWith(".jpg")) {
        items.push(buildReviewItem(finalRoot, reviewRoot, topicId, file));
      }
    }
  }

  return items.sort((a, b) => {
    if (a.topic_id !== b.topic_id) return a.topic_id.localeCompare(b.topic_id);
    return labelSortValue(a.label) - labelSortValue(b.label);
  });
}

function buildCard(item) {
  const title = htmlEscape(item.topic_id + " / " + item.label);
  const src = htmlEscape(item.review_image_src);
  const checks = item.must_check.map((check) => {
    return "<li>" + htmlEscape(check) + "</li>";
  }).join("");

  return [
    '<article class="card">',
    "<h2>" + title + "</h2>",
    '<a href="' + src + '" target="_blank">',
    '<img src="' + src + '" alt="' + title + '">',
    "</a>",
    "<p><strong>Status:</strong> pending human review</p>",
    "<ul>" + checks + "</ul>",
    "</article>"
  ].join("\n");
}

export function buildReviewHtml(items) {
  const cards = items.map(buildCard).join("\n");

  return [
    "<!doctype html>",
    "<html>",
    "<head>",
    '<meta charset="utf-8">',
    "<title>Ember & Stone Final Image Review</title>",
    "<style>",
    "body { margin: 24px; font-family: Arial, sans-serif; background: #111; color: #eee; }",
    "h1 { margin-bottom: 8px; }",
    ".summary { color: #bbb; margin-bottom: 24px; }",
    ".grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 18px; }",
    ".card { background: #1b1b1b; border: 1px solid #333; border-radius: 14px; padding: 14px; }",
    ".card h2 { font-size: 16px; margin: 0 0 10px; }",
    ".card img { width: 100%; border-radius: 10px; border: 1px solid #333; display: block; }",
    ".card p, .card li { color: #ccc; font-size: 13px; }",
    "</style>",
    "</head>",
    "<body>",
    "<h1>Ember & Stone Final Image Review</h1>",
    '<p class="summary">Review every image for beat match, channel style consistency, and production quality before video assembly.</p>',
    '<section class="grid">',
    cards,
    "</section>",
    "</body>",
    "</html>"
  ].join("\n");
}

export async function writeReviewPacket(paths, items) {
  await fs.mkdir(paths.reviewRoot, { recursive: true });

  await fs.writeFile(paths.reviewJson, JSON.stringify({
    created_at: new Date().toISOString(),
    image_count: items.length,
    status: "pending_human_review",
    items
  }, null, 2));

  await fs.writeFile(paths.reviewHtml, buildReviewHtml(items));
}
