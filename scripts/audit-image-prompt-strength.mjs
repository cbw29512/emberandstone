// scripts/audit-image-prompt-strength.mjs
// Purpose: Strictly validate image prompt packages for the currently selected production topics.
// Why: Daily automation must fail closed for the active video without being blocked by old legacy outputs.

import path from "node:path";
import { readJson, logInfo, logError } from "./lib/json-utils.mjs";

const ROOT_DIR = process.cwd();
const VISUAL_ROOT = path.join(ROOT_DIR, "output", "visuals");
const SELECTED_TOPICS_PATH = path.join(ROOT_DIR, "output", "state", "selected-topics.json");

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function getPromptText(promptObject) {
  if (!isObject(promptObject)) {
    return "";
  }

  return String(promptObject.prompt_text || promptObject.prompt || "").trim();
}

function getThumbnailPrompt(promptPackage) {
  if (isObject(promptPackage.thumbnail_prompt)) return promptPackage.thumbnail_prompt;
  if (isObject(promptPackage.thumbnail)) return promptPackage.thumbnail;
  if (isObject(promptPackage.prompt_objects?.thumbnail)) return promptPackage.prompt_objects.thumbnail;
  if (isObject(promptPackage.prompts?.thumbnail)) return promptPackage.prompts.thumbnail;
  if (isObject(promptPackage.image_prompts?.thumbnail)) return promptPackage.image_prompts.thumbnail;
  if (isObject(promptPackage.visual_prompts?.thumbnail)) return promptPackage.visual_prompts.thumbnail;

  return null;
}

function getScenePrompt(scene, promptPackage) {
  const sceneKey = "scene-" + scene.scene_number;

  if (isObject(scene.image_prompt)) return scene.image_prompt;
  if (isObject(scene.prompt)) return scene.prompt;
  if (isObject(scene.visual_prompt)) return scene.visual_prompt;
  if (isObject(promptPackage.prompt_objects?.[sceneKey])) return promptPackage.prompt_objects[sceneKey];
  if (isObject(promptPackage.prompts?.[sceneKey])) return promptPackage.prompts[sceneKey];
  if (isObject(promptPackage.image_prompts?.[sceneKey])) return promptPackage.image_prompts[sceneKey];
  if (isObject(promptPackage.visual_prompts?.[sceneKey])) return promptPackage.visual_prompts[sceneKey];

  return null;
}

function checkStrictPromptObject(label, promptObject, failures) {
  if (!isObject(promptObject)) {
    failures.push(label + " must be an object");
    return;
  }

  const requiredStringFields = [
    "image_must_show",
    "main_action",
    "environment",
    "background",
    "camera_and_framing",
    "emotional_mood",
    "style"
  ];

  if (!getPromptText(promptObject)) {
    failures.push(label + " must include prompt_text or prompt.");
  }

  for (const field of requiredStringFields) {
    if (!nonEmptyString(promptObject[field])) {
      failures.push(label + " missing non-empty " + field + ".");
    }
  }

  if (!Array.isArray(promptObject.required_visible_elements) || promptObject.required_visible_elements.length === 0) {
    failures.push(label + " missing required_visible_elements array.");
  }

  const hasForbiddenGuidance =
    (Array.isArray(promptObject.do_not_show_or_imply) && promptObject.do_not_show_or_imply.length > 0)
    || nonEmptyString(promptObject.negative_prompt);

  if (!hasForbiddenGuidance) {
    failures.push(label + " missing do_not_show_or_imply or negative_prompt.");
  }
}

async function getSelectedTopics() {
  const selectedState = await readJson(SELECTED_TOPICS_PATH, "selected-topics.json");
  const topics = Array.isArray(selectedState.topics) ? selectedState.topics : [];

  if (topics.length === 0) {
    throw new Error("No selected topics found for strict image prompt audit.");
  }

  return topics;
}

async function auditTopic(topic, failures) {
  const packagePath = path.join(VISUAL_ROOT, topic.id, "image-prompt-package.json");
  const promptPackage = await readJson(packagePath, "image prompt package for " + topic.id);

  const thumbnailPrompt = getThumbnailPrompt(promptPackage);
  checkStrictPromptObject(topic.id + " thumbnail", thumbnailPrompt, failures);

  const scenes = Array.isArray(promptPackage.scenes) ? promptPackage.scenes : [];

  if (scenes.length === 0) {
    failures.push(topic.id + " must include at least one scene.");
  }

  for (const scene of scenes) {
    const scenePrompt = getScenePrompt(scene, promptPackage);
    checkStrictPromptObject(topic.id + " scene-" + scene.scene_number, scenePrompt, failures);
  }
}

async function main() {
  try {
    logInfo("Running strict image prompt audit...");

    const selectedTopics = await getSelectedTopics();
    const failures = [];

    for (const topic of selectedTopics) {
      await auditTopic(topic, failures);
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
