// scripts/generate-image-prompt-packages.mjs
// Purpose: Generate image prompt packages for selected topics.
// Why: Visual prompts are local prep; no paid image API is called here.

import path from "node:path";
import { readJson, writeJson, logInfo, logError } from "./lib/json-utils.mjs";
import { buildImagePromptPackage } from "./lib/image-prompt-builder.mjs";

const ROOT_DIR = process.cwd();
const SELECTED_TOPICS_PATH = path.join(ROOT_DIR, "output", "state", "selected-topics.json");
const VISUAL_ROOT = path.join(ROOT_DIR, "output", "visuals");

async function main() {
  try {
    logInfo("Generating image prompt packages...");

    const selectedState = await readJson(SELECTED_TOPICS_PATH, "selected-topics.json");
    const selectedTopics = Array.isArray(selectedState.topics) ? selectedState.topics : [];
    const created = [];

    if (selectedTopics.length === 0) {
      throw new Error("No selected topics found.");
    }

    for (const topic of selectedTopics) {
      const result = await buildImagePromptPackage(ROOT_DIR, topic);

      if (result.skipped) {
        logInfo("Skipping image prompts for " + topic.title + " because gates are not ready.");
        logInfo(JSON.stringify(result.gateStatus));
        continue;
      }

      const outputPath = path.join(VISUAL_ROOT, topic.id, "image-prompt-package.json");
      await writeJson(outputPath, result.promptPackage);
      created.push(topic.id);
      logInfo("Image prompt package created for: " + topic.title);
    }

    if (created.length === 0) {
      throw new Error("No image prompt packages were created.");
    }

    logInfo("Image prompt package count: " + created.length);
  } catch (error) {
    logError(error.message);
    process.exitCode = 1;
  }
}

await main();
