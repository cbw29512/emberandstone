// scripts/lib/visual-slot-planner.mjs
// Purpose: Plan unique, script-relevant visual slots for final videos.
// Why: Final uploads should not rely on repeated images every 25 seconds.

import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { readVideoRenderPolicy } from "./video-render-policy.mjs";

function fail(message) {
  throw new Error(message);
}

function runRequired(command, args, label) {
  const result = spawnSync(command, args, { encoding: "utf8", shell: false });

  if (result.error) {
    fail(label + " failed to start: " + result.error.message);
  }

  if (result.status !== 0) {
    fail(label + " failed: " + String(result.stderr || "").trim());
  }

  return String(result.stdout || "").trim();
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw.replace(/^\uFEFF/, ""));
}

function getAudioDuration(audioFile) {
  const output = runRequired("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    audioFile
  ], "ffprobe audio duration");

  const duration = Number(output);

  if (!Number.isFinite(duration) || duration <= 0) {
    fail("Invalid audio duration: " + audioFile);
  }

  return duration;
}

async function getTopicIds(rootDir) {
  const audioRoot = path.join(rootDir, "output", "audio");

  if (!(await pathExists(audioRoot))) {
    fail("Missing audio folder: " + audioRoot);
  }

  const entries = await fs.readdir(audioRoot, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

async function getFinalSceneImages(rootDir, topicId) {
  const finalDir = path.join(rootDir, "output", "images", "final", topicId);

  if (!(await pathExists(finalDir))) {
    return [];
  }

  const files = await fs.readdir(finalDir);

  return files
    .filter((file) => /^scene-\d+\.jpg$/.test(file))
    .sort((a, b) => {
      const left = Number(a.match(/\d+/)?.[0] || 999);
      const right = Number(b.match(/\d+/)?.[0] || 999);
      return left - right;
    });
}

async function getScenePromptPackage(rootDir, topicId) {
  const packagePath = path.join(rootDir, "output", "visuals", topicId, "image-prompt-package.json");

  if (!(await pathExists(packagePath))) {
    fail("Missing image prompt package: " + packagePath);
  }

  return readJson(packagePath);
}

function pickSourceSceneIndex(slotIndex, slotCount, sceneCount) {
  if (sceneCount <= 0) {
    return 0;
  }

  const ratio = slotIndex / Math.max(1, slotCount);
  const sceneIndex = Math.floor(ratio * sceneCount);

  return Math.min(sceneIndex, sceneCount - 1);
}

function buildMissingSlots(topicId, requiredSlots, existingCount, promptPackage) {
  const scenes = Array.isArray(promptPackage.scenes) ? promptPackage.scenes : [];
  const missing = [];

  for (let index = existingCount; index < requiredSlots; index += 1) {
    const sceneIndex = pickSourceSceneIndex(index, requiredSlots, scenes.length);
    const sourceScene = scenes[sceneIndex] || {};

    missing.push({
      planned_slot_number: index + 1,
      suggested_file_label: "scene-extra-" + String(index + 1).padStart(2, "0"),
      source_scene_number: sourceScene.scene_number || sceneIndex + 1,
      source_scene_title: sourceScene.scene_title || "Untitled scene",
      narration_summary: sourceScene.narration_summary || "",
      prompt_strategy: "Create a new unique visual beat from this source scene. Do not reuse an existing image.",
      status: "needs_new_unique_image"
    });
  }

  return missing;
}

export async function buildVisualSlotPlans(rootDir) {
  const policy = await readVideoRenderPolicy(rootDir);
  const topicIds = await getTopicIds(rootDir);
  const plans = [];

  for (const topicId of topicIds) {
    const audioFile = path.join(rootDir, "output", "audio", topicId, "narration.mp3");
    const duration = getAudioDuration(audioFile);
    const requiredSlots = Math.ceil(duration / policy.target_seconds_per_image);
    const currentImages = await getFinalSceneImages(rootDir, topicId);
    const promptPackage = await getScenePromptPackage(rootDir, topicId);
    const missingSlots = buildMissingSlots(topicId, requiredSlots, currentImages.length, promptPackage);

    plans.push({
      topic_id: topicId,
      audio_file: audioFile,
      duration_seconds: duration,
      target_seconds_per_image: policy.target_seconds_per_image,
      required_unique_visual_slots: requiredSlots,
      current_unique_scene_images: currentImages.length,
      current_scene_images: currentImages,
      additional_unique_images_needed: Math.max(0, requiredSlots - currentImages.length),
      missing_slots: missingSlots,
      status: missingSlots.length > 0 ? "needs_more_unique_images" : "enough_unique_images"
    });
  }

  return plans;
}
