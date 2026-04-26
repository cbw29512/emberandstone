// scripts/generate-image-prompt-packages.mjs
// Purpose: Build image prompt packages from approved scene metadata.
// Why: Visual generation must happen only after story, scene alignment, and audio gates pass.

import path from "node:path";
import { readJson, writeJson, logInfo, logError } from "./lib/json-utils.mjs";
import { fileSizeBytes } from "./lib/audio-file-utils.mjs";

const ROOT_DIR = process.cwd();
const SELECTED_TOPICS_PATH = path.join(ROOT_DIR, "output", "state", "selected-topics.json");
const SCRIPT_ROOT = path.join(ROOT_DIR, "output", "scripts");
const AUDIO_ROOT = path.join(ROOT_DIR, "output", "audio");
const STORY_AUDIT_ROOT = path.join(ROOT_DIR, "output", "story-audit");
const SCENE_AUDIT_ROOT = path.join(ROOT_DIR, "output", "scene-alignment");
const VISUAL_ROOT = path.join(ROOT_DIR, "output", "visuals");

async function tryReadJson(filePath, fallback) {
  try {
    return await readJson(filePath, filePath);
  } catch {
    return fallback;
  }
}

async function hasUsableAudio(topicId) {
  const audioPath = path.join(AUDIO_ROOT, topicId, "narration.mp3");
  const bytes = await fileSizeBytes(audioPath);
  return bytes > 0;
}

async function gatesPassed(topicId) {
  const storyPath = path.join(STORY_AUDIT_ROOT, topicId, "story-audit.json");
  const scenePath = path.join(SCENE_AUDIT_ROOT, topicId, "scene-alignment-audit.json");

  const storyAudit = await tryReadJson(storyPath, null);
  const sceneAudit = await tryReadJson(scenePath, null);
  const audioReady = await hasUsableAudio(topicId);

  return {
    story_passed: storyAudit?.pass === true,
    scene_alignment_passed: sceneAudit?.pass === true,
    audio_ready: audioReady
  };
}

function buildVisualStyle() {
  return {
    format: "cinematic dark fantasy still images with subtle motion later",
    aspect_ratio: "16:9",
    avoid: [
      "text",
      "letters",
      "logos",
      "official D&D art",
      "recognizable copyrighted characters",
      "modern objects",
      "watermarks"
    ],
    style_notes: [
      "dark fantasy",
      "painterly cinematic realism",
      "ancient mystery",
      "high contrast torchlight",
      "fog and shadow",
      "clear subject focus"
    ]
  };
}

function buildScenePrompt(topic, scene, index) {
  return {
    scene_number: Number(scene.scene_number || index + 1),
    scene_title: scene.scene_title || "Untitled scene",
    narration_summary: scene.narration_summary || "",
    image_prompt: scene.visual_prompt || "",
    negative_prompt: "text, letters, logos, watermark, modern clothing, modern city, official D&D art, copyrighted characters",
    intended_motion_later: "slow zoom or slow pan with subtle fog/torchlight movement",
    status: "prompt_ready"
  };
}

async function buildPackage(topic) {
  const topicId = topic.id;
  const gateStatus = await gatesPassed(topicId);

  if (!gateStatus.story_passed || !gateStatus.scene_alignment_passed || !gateStatus.audio_ready) {
    logInfo("Skipping image prompts for " + topic.title + " because gates are not ready.");
    logInfo(JSON.stringify(gateStatus));
    return null;
  }

  const draftPath = path.join(SCRIPT_ROOT, topicId, "script-draft-tightened.json");
  const draft = await readJson(draftPath, "tightened script for " + topicId);
  const scenes = Array.isArray(draft.scenes) ? draft.scenes : [];

  if (scenes.length === 0) {
    throw new Error("No scenes found for " + topicId);
  }

  return {
    topic_id: topicId,
    topic_title: topic.title,
    final_video_title: draft.final_video_title,
    visual_status: "image_prompts_ready",
    gates: gateStatus,
    visual_style: buildVisualStyle(),
    thumbnail_prompt: draft.thumbnail_prompt || null,
    scenes: scenes.map(buildScenePrompt),
    created_at: new Date().toISOString()
  };
}

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
      const promptPackage = await buildPackage(topic);

      if (!promptPackage) {
        continue;
      }

      const outputPath = path.join(VISUAL_ROOT, topic.id, "image-prompt-package.json");
      await writeJson(outputPath, promptPackage);
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
