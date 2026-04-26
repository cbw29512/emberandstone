// scripts/audit-image-prompt-strength.mjs
// Purpose: Strictly audit beat-lock prompt structure.
// Why: Weak prompt structure causes visual drift and wasted image credits.

import fs from "node:fs/promises";
import path from "node:path";
import { validateBeatLock } from "./lib/image-prompt-compiler.mjs";
import { readJson, logInfo, logError } from "./lib/json-utils.mjs";

const ROOT_DIR = process.cwd();
const VISUAL_ROOT = path.join(ROOT_DIR, "output", "visuals");

async function getTopicDirs() {
  try {
    const entries = await fs.readdir(VISUAL_ROOT, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch (error) {
    throw new Error("Could not read visual output folder: " + error.message);
  }
}

function checkScene(scene, topicId, failures) {
  const label = topicId + " scene-" + scene.scene_number;

  try {
    validateBeatLock(scene.beat_lock, label);
  } catch (error) {
    failures.push(error.message);
  }
}

function checkThumbnail(promptPackage, topicId, failures) {
  const label = topicId + " thumbnail";

  try {
    validateBeatLock(promptPackage.thumbnail_beat_lock, label);
  } catch (error) {
    failures.push(error.message);
  }
}

async function main() {
  try {
    logInfo("Running strict image prompt audit...");

    const failures = [];
    const topicDirs = await getTopicDirs();

    for (const topicId of topicDirs) {
      const packagePath = path.join(VISUAL_ROOT, topicId, "image-prompt-package.json");
      const promptPackage = await readJson(packagePath, "image prompt package for " + topicId);

      checkThumbnail(promptPackage, topicId, failures);

      for (const scene of promptPackage.scenes || []) {
        checkScene(scene, topicId, failures);
      }
    }

    if (failures.length > 0) {
      logError("Strict image prompt audit failed.");

      for (const failure of failures) {
        logError(failure);
      }

      process.exitCode = 1;
      return;
    }

    logInfo("Strict image prompt audit passed.");
  } catch (error) {
    logError(error.message);
    process.exitCode = 1;
  }
}

await main();
