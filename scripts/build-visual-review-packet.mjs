// scripts/build-visual-review-packet.mjs
// Purpose: Build a human visual review packet for all final images.
// Why: Production-grade videos need full image QA before assembly.

import path from "node:path";
import {
  collectFinalImages,
  writeReviewPacket
} from "./lib/visual-review-packet.mjs";

const ROOT_DIR = process.cwd();

const PATHS = {
  finalRoot: path.join(ROOT_DIR, "output", "images", "final"),
  reviewRoot: path.join(ROOT_DIR, "output", "review", "visual-final-review"),
  reviewJson: path.join(ROOT_DIR, "output", "review", "visual-final-review", "final-image-review.json"),
  reviewHtml: path.join(ROOT_DIR, "output", "review", "visual-final-review", "final-image-review.html")
};

function logInfo(message) {
  console.log("[INFO] " + message);
}

async function main() {
  try {
    logInfo("Building visual review packet...");

    const items = await collectFinalImages(PATHS.finalRoot, PATHS.reviewRoot);

    if (items.length === 0) {
      throw new Error("No final JPG images found.");
    }

    await writeReviewPacket(PATHS, items);

    logInfo("Review image count: " + items.length);
    logInfo("Saved review JSON: " + PATHS.reviewJson);
    logInfo("Saved review HTML: " + PATHS.reviewHtml);
  } catch (error) {
    console.error("[ERROR] " + error.message);
    process.exitCode = 1;
  }
}

await main();
