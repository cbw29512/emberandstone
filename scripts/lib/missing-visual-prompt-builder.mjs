// scripts/lib/missing-visual-prompt-builder.mjs
// Purpose: Build prompt packages for missing unique final visuals.
// Why: Final videos need script-relevant images, not repeated filler.

import fs from "node:fs/promises";
import path from "node:path";
import { readChannelStyle, buildChannelStylePrompt } from "./channel-style.mjs";

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

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw.replace(/^\uFEFF/, ""));
}

function sceneNumberValue(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function findSourceScene(promptPackage, slot) {
  const scenes = Array.isArray(promptPackage.scenes) ? promptPackage.scenes : [];
  const wanted = sceneNumberValue(slot.source_scene_number);

  return scenes.find((scene) => sceneNumberValue(scene.scene_number) === wanted) || scenes[wanted - 1] || {};
}

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function buildPrompt(channelStylePrompt, topicId, slot, scene) {
  const title = cleanText(scene.scene_title) || cleanText(slot.source_scene_title) || "dark fantasy story beat";
  const summary = cleanText(scene.narration_summary) || cleanText(slot.narration_summary);
  const basePrompt = cleanText(scene.image_prompt);
  const beatLock = scene.beat_lock && typeof scene.beat_lock === "object"
    ? JSON.stringify(scene.beat_lock)
    : "";

  return [
    channelStylePrompt,
    "UNIQUE FINAL VIDEO VISUAL.",
    "Topic: " + topicId + ".",
    "Create a new image for visual slot " + slot.planned_slot_number + ".",
    "This image must not reuse, duplicate, mirror, or closely copy any existing image from this video.",
    "Scene title: " + title + ".",
    summary ? "Narration beat: " + summary + "." : "",
    basePrompt ? "Existing scene direction to evolve from: " + basePrompt : "",
    beatLock ? "Scene beat lock data: " + beatLock : "",
    "Create a fresh camera angle, fresh composition, and fresh visual detail while staying faithful to the same narration moment.",
    "Dark fantasy lore video still, cinematic composition, strong focal point, atmospheric depth, moody fog, candlelit or moonlit shadows, no readable text, no letters, no logos, no watermark, no modern objects."
  ].filter(Boolean).join(" ");
}

function buildNegativePrompt(scene) {
  const sceneNegative = cleanText(scene.negative_prompt);

  return [
    sceneNegative,
    "duplicate composition",
    "same image as earlier scene",
    "reused frame",
    "text",
    "letters",
    "logos",
    "watermark",
    "signature",
    "modern clothing",
    "modern city",
    "official D&D art",
    "copyrighted characters"
  ].filter(Boolean).join(", ");
}

export async function buildMissingVisualPromptPackages(rootDir) {
  const channelStyle = await readChannelStyle(rootDir);
  const channelStylePrompt = buildChannelStylePrompt(channelStyle);
  const planRoot = path.join(rootDir, "output", "visual-slot-plans");

  if (!(await pathExists(planRoot))) {
    fail("Missing visual slot plans folder: " + planRoot);
  }

  const topicEntries = await fs.readdir(planRoot, { withFileTypes: true });
  const packages = [];

  for (const entry of topicEntries) {
    if (!entry.isDirectory()) continue;

    const topicId = entry.name;
    const planPath = path.join(planRoot, topicId, "visual-slot-plan.json");
    const promptPackagePath = path.join(rootDir, "output", "visuals", topicId, "image-prompt-package.json");

    if (!(await pathExists(planPath))) fail("Missing visual slot plan: " + planPath);
    if (!(await pathExists(promptPackagePath))) fail("Missing image prompt package: " + promptPackagePath);

    const plan = await readJson(planPath);
    const promptPackage = await readJson(promptPackagePath);
    const missingSlots = Array.isArray(plan.missing_slots) ? plan.missing_slots : [];

    const prompts = missingSlots.map((slot) => {
      const scene = findSourceScene(promptPackage, slot);

      return {
        topic_id: topicId,
        planned_slot_number: slot.planned_slot_number,
        suggested_file_label: slot.suggested_file_label,
        source_scene_number: slot.source_scene_number,
        source_scene_title: slot.source_scene_title,
        prompt: buildPrompt(channelStylePrompt, topicId, slot, scene),
        negative_prompt: buildNegativePrompt(scene),
        status: "ready_for_prompt_review"
      };
    });

    packages.push({
      topic_id: topicId,
      required_unique_visual_slots: plan.required_unique_visual_slots,
      current_unique_scene_images: plan.current_unique_scene_images,
      additional_unique_images_needed: plan.additional_unique_images_needed,
      prompt_count: prompts.length,
      prompts
    });
  }

  return packages;
}
