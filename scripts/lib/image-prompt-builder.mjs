// scripts/lib/image-prompt-builder.mjs
// Purpose: Build image prompt packages from normalized scene metadata.
// Why: The runner should stay small while this module owns package construction.

import path from "node:path";
import { readJson } from "./json-utils.mjs";
import { normalizeScene } from "./scene-field-normalizer.mjs";
import { getVisualGateStatus, visualGatesReady } from "./visual-gates.mjs";
import { validatePromptPackage } from "./image-prompt-validator.mjs";

function buildThumbnailPrompt(topic, draft, firstScene) {
  const existing = draft.thumbnail_prompt || draft.thumbnailPrompt || "";

  if (existing) {
    return existing;
  }

  return [
    "Dark fantasy cinematic YouTube thumbnail,",
    topic.title + ",",
    firstScene.image_prompt,
    "dramatic composition, high contrast, no text, no letters, no logos"
  ].join(" ");
}

function buildScenePrompt(scene, index) {
  const normalized = normalizeScene(scene, index);

  return {
    scene_number: normalized.scene_number,
    scene_title: normalized.scene_title,
    narration_summary: normalized.narration_summary,
    image_prompt: normalized.image_prompt,
    negative_prompt: "text, letters, logos, watermark, modern clothing, modern city, official D&D art, copyrighted characters",
    intended_motion_later: "slow zoom or slow pan with subtle fog/torchlight movement",
    status: "prompt_ready",
    source_keys: normalized.source_keys
  };
}

export async function buildImagePromptPackage(rootDir, topic) {
  const gateStatus = await getVisualGateStatus(rootDir, topic.id);

  if (!visualGatesReady(gateStatus)) {
    return {
      skipped: true,
      reason: "Gates not ready.",
      gateStatus
    };
  }

  const draftPath = path.join(rootDir, "output", "scripts", topic.id, "script-draft-tightened.json");
  const draft = await readJson(draftPath, "tightened script for " + topic.id);
  const rawScenes = Array.isArray(draft.scenes) ? draft.scenes : [];
  const scenes = rawScenes.map(buildScenePrompt);

  if (scenes.length === 0) {
    throw new Error("No scenes found for " + topic.id);
  }

  const promptPackage = {
    topic_id: topic.id,
    topic_title: topic.title,
    final_video_title: draft.final_video_title,
    visual_status: "image_prompts_ready",
    gates: gateStatus,
    thumbnail_prompt: buildThumbnailPrompt(topic, draft, scenes[0]),
    scenes,
    created_at: new Date().toISOString()
  };

  validatePromptPackage(topic.id, promptPackage);
  return { skipped: false, promptPackage };
}
