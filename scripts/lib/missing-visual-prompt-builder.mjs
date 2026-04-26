// scripts/lib/missing-visual-prompt-builder.mjs
// Purpose: Build Leonardo-safe prompt packages for missing unique visuals.
// Why: Leonardo rejects prompts over 1500 characters.

import fs from "node:fs/promises";
import path from "node:path";
import { readChannelStyle } from "./channel-style.mjs";

const MAX_PROMPT_LENGTH = 1400;

const VARIANTS = [
  "wide establishing angle with clear environment storytelling",
  "closer character-focused angle with strong emotion",
  "object-focused detail shot tied to the narration",
  "low-angle cinematic view with ominous depth",
  "over-the-shoulder witness perspective",
  "quiet aftermath composition with one strong focal point",
  "symbolic foreground detail with blurred background",
  "moonlit or candlelit side angle with heavy atmosphere"
];

function fail(message) {
  throw new Error(message);
}

function cleanText(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function limitText(value, maxLength) {
  const text = cleanText(value);

  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, Math.max(0, maxLength - 3)).trim() + "...";
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

function compactChannelStyle(style) {
  const palette = Array.isArray(style.palette) ? style.palette.slice(0, 7).join(", ") : "";
  const mood = Array.isArray(style.mood) ? style.mood.slice(0, 7).join(", ") : "";

  return [
    "CHANNEL CONSISTENCY LOCK.",
    "Ember & Stone dark fantasy lore illustration.",
    "Cinematic, mythic, ancient, eerie, solemn, production-grade.",
    palette ? "Palette: " + palette + "." : "",
    mood ? "Mood: " + mood + "." : "",
    "Muted charcoal, ash, stone, fog-blue, parchment, restrained amber candlelight.",
    "No modern objects, no sci-fi, no cartoon, no anime, no text, no logos, no watermark."
  ].filter(Boolean).join(" ");
}

function beatLockSummary(scene) {
  if (!scene.beat_lock || typeof scene.beat_lock !== "object") {
    return "";
  }

  const raw = JSON.stringify(scene.beat_lock);
  return limitText(raw, 280);
}

function buildPrompt(channelStylePrompt, topicId, slot, scene) {
  const title = cleanText(scene.scene_title) || cleanText(slot.source_scene_title) || "dark fantasy story beat";
  const summary = cleanText(scene.narration_summary) || cleanText(slot.narration_summary);
  const basePrompt = cleanText(scene.image_prompt);
  const variant = VARIANTS[(Number(slot.planned_slot_number) - 1) % VARIANTS.length];

  const parts = [
    channelStylePrompt,
    "UNIQUE FINAL VIDEO VISUAL.",
    "Topic: " + topicId + ". Slot " + slot.planned_slot_number + ".",
    "Scene title: " + title + ".",
    summary ? "Narration beat: " + limitText(summary, 210) + "." : "",
    basePrompt ? "Existing scene direction to evolve from: " + limitText(basePrompt, 260) + "." : "",
    "Scene beat lock data: " + beatLockSummary(scene) + ".",
    "New visual variation: " + variant + ".",
    "This image must not reuse, duplicate, mirror, or closely copy any existing image from this video.",
    "Use a fresh camera angle, fresh composition, and fresh visual detail while staying faithful to the narration.",
    "Dark fantasy lore video still, strong focal point, atmospheric depth, moody fog, candlelit or moonlit shadows."
  ].filter(Boolean);

  let prompt = parts.join(" ");

  if (prompt.length > MAX_PROMPT_LENGTH) {
    prompt = prompt
      .replace(/Existing scene direction to evolve from:.*?\. Scene beat lock data:/, "Scene beat lock data:")
      .replace(/\s+/g, " ")
      .trim();
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    prompt = limitText(prompt, MAX_PROMPT_LENGTH);
  }

  return prompt;
}

function buildNegativePrompt(scene) {
  const sceneNegative = limitText(cleanText(scene.negative_prompt), 280);

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
  const channelStylePrompt = compactChannelStyle(channelStyle);
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
