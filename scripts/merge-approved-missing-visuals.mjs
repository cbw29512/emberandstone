// scripts/merge-approved-missing-visuals.mjs
// Purpose: Merge user-approved missing-unique images into final video image folders.
// Why: Final videos need a full unique visual sequence before review rendering.

import fs from "node:fs/promises";
import path from "node:path";

const ROOT_DIR = process.cwd();
const MISSING_ROOT = path.join(ROOT_DIR, "output", "images", "missing-unique");
const FINAL_ROOT = path.join(ROOT_DIR, "output", "images", "final");
const LEDGER_PATH = path.join(ROOT_DIR, "output", "review", "approved-missing-visuals-ledger.json");

function logInfo(message) {
  console.log("[INFO] " + message);
}

function fail(message) {
  throw new Error(message);
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function extractSlotNumber(fileName) {
  const match = fileName.match(/^scene-extra-(\d+)\.jpg$/);

  if (!match) {
    return null;
  }

  return Number(match[1]);
}

function finalSceneFileName(slotNumber) {
  return "scene-" + String(slotNumber).padStart(2, "0") + ".jpg";
}

async function collectApprovedImages() {
  if (!(await pathExists(MISSING_ROOT))) {
    fail("Missing approved image source folder: " + MISSING_ROOT);
  }

  const topicEntries = await fs.readdir(MISSING_ROOT, { withFileTypes: true });
  const items = [];

  for (const topicEntry of topicEntries) {
    if (!topicEntry.isDirectory()) {
      continue;
    }

    const topicId = topicEntry.name;
    const topicDir = path.join(MISSING_ROOT, topicId);
    const files = await fs.readdir(topicDir);

    for (const fileName of files) {
      const slotNumber = extractSlotNumber(fileName);

      if (!slotNumber) {
        continue;
      }

      items.push({
        topic_id: topicId,
        slot_number: slotNumber,
        source_file: path.join(topicDir, fileName),
        final_file: path.join(FINAL_ROOT, topicId, finalSceneFileName(slotNumber)),
        status: "approved_by_user_for_final_sequence"
      });
    }
  }

  return items.sort((a, b) => {
    if (a.topic_id !== b.topic_id) {
      return a.topic_id.localeCompare(b.topic_id);
    }

    return a.slot_number - b.slot_number;
  });
}

async function copyApprovedImages(items) {
  const copied = [];

  for (const item of items) {
    await fs.mkdir(path.dirname(item.final_file), { recursive: true });

    if (await pathExists(item.final_file)) {
      copied.push({
        ...item,
        merge_status: "skipped_existing_final_file"
      });

      continue;
    }

    await fs.copyFile(item.source_file, item.final_file);

    copied.push({
      ...item,
      merge_status: "copied_to_final_sequence"
    });
  }

  return copied;
}

async function writeLedger(items) {
  await fs.mkdir(path.dirname(LEDGER_PATH), { recursive: true });

  await fs.writeFile(LEDGER_PATH, JSON.stringify({
    created_at: new Date().toISOString(),
    approval_basis: "User reviewed missing-unique image review page and said the images look good.",
    item_count: items.length,
    items
  }, null, 2));
}

async function main() {
  try {
    logInfo("Collecting approved missing-unique images...");

    const approved = await collectApprovedImages();

    if (approved.length === 0) {
      fail("No approved missing-unique images found to merge.");
    }

    const copied = await copyApprovedImages(approved);
    await writeLedger(copied);

    const copiedCount = copied.filter((item) => item.merge_status === "copied_to_final_sequence").length;
    const skippedCount = copied.filter((item) => item.merge_status === "skipped_existing_final_file").length;

    logInfo("Approved images found: " + approved.length);
    logInfo("Copied into final sequence: " + copiedCount);
    logInfo("Skipped existing final files: " + skippedCount);
    logInfo("Saved approval ledger: " + LEDGER_PATH);
  } catch (error) {
    console.error("[ERROR] Merge approved missing visuals failed: " + error.message);
    process.exitCode = 1;
  }
}

await main();
