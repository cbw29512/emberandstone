// scripts/audit-image-prompts.mjs
// Purpose: Verify image prompt packages are populated before paid image generation.
// Why: Empty prompts create bad videos and waste image credits.

import path from "node:path";
import { readJson, logInfo, logError } from "./lib/json-utils.mjs";

const ROOT_DIR = process.cwd();
const SELECTED_TOPICS_PATH = path.join(ROOT_DIR, "output", "state", "selected-topics.json");
const VISUAL_ROOT = path.join(ROOT_DIR, "output", "visuals");

function isBlank(value) {
  return String(value || "").trim() === "";
}

async function auditTopic(topic) {
  const packagePath = path.join(VISUAL_ROOT, topic.id, "image-prompt-package.json");
  const promptPackage = await readJson(packagePath, "image prompt package for " + topic.id);
  const failures = [];

  if (isBlank(promptPackage.thumbnail_prompt)) {
    failures.push("thumbnail_prompt is blank.");
  }

  if (!Array.isArray(promptPackage.scenes) || promptPackage.scenes.length === 0) {
    failures.push("scenes array is missing or empty.");
  }

  for (const scene of promptPackage.scenes || []) {
    if (isBlank(scene.scene_title) || String(scene.scene_title).startsWith("Scene ")) {
      failures.push("Scene " + scene.scene_number + " has weak or blank title.");
    }

    if (isBlank(scene.narration_summary)) {
      failures.push("Scene " + scene.scene_number + " has blank narration_summary.");
    }

    if (isBlank(scene.image_prompt)) {
      failures.push("Scene " + scene.scene_number + " has blank image_prompt.");
    }

    if (!String(scene.negative_prompt || "").includes("text")) {
      failures.push("Scene " + scene.scene_number + " negative prompt missing text exclusion.");
    }
  }

  if (failures.length > 0) {
    failures.forEach((failure) => logError(topic.title + ": " + failure));
  }

  logInfo(topic.title + " image prompt audit pass: " + (failures.length === 0));
  return { topic_id: topic.id, pass: failures.length === 0, failures };
}

async function main() {
  try {
    logInfo("Auditing image prompt packages...");

    const selectedState = await readJson(SELECTED_TOPICS_PATH, "selected-topics.json");
    const selectedTopics = Array.isArray(selectedState.topics) ? selectedState.topics : [];

    if (selectedTopics.length === 0) {
      throw new Error("No selected topics found.");
    }

    const results = [];

    for (const topic of selectedTopics) {
      results.push(await auditTopic(topic));
    }

    const passCount = results.filter((result) => result.pass === true).length;
    logInfo("Image prompt audit pass count: " + passCount + " of " + results.length);

    if (passCount !== results.length) {
      throw new Error("Image prompt audit failed.");
    }
  } catch (error) {
    logError(error.message);
    process.exitCode = 1;
  }
}

await main();
