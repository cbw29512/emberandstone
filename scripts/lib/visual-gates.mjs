// scripts/lib/visual-gates.mjs
// Purpose: Verify story, scene-alignment, and audio gates before visuals.
// Why: Image prompt packages should not exist unless upstream quality checks passed.

import path from "node:path";
import { readJson } from "./json-utils.mjs";
import { fileSizeBytes } from "./audio-file-utils.mjs";

async function tryReadJson(filePath, fallback) {
  try {
    return await readJson(filePath, filePath);
  } catch {
    return fallback;
  }
}

export async function getVisualGateStatus(rootDir, topicId) {
  const storyPath = path.join(rootDir, "output", "story-audit", topicId, "story-audit.json");
  const scenePath = path.join(rootDir, "output", "scene-alignment", topicId, "scene-alignment-audit.json");
  const audioPath = path.join(rootDir, "output", "audio", topicId, "narration.mp3");

  const storyAudit = await tryReadJson(storyPath, null);
  const sceneAudit = await tryReadJson(scenePath, null);
  const audioBytes = await fileSizeBytes(audioPath);

  return {
    story_passed: storyAudit?.pass === true,
    scene_alignment_passed: sceneAudit?.pass === true,
    audio_ready: audioBytes > 0
  };
}

export function visualGatesReady(gateStatus) {
  return Boolean(
    gateStatus.story_passed &&
    gateStatus.scene_alignment_passed &&
    gateStatus.audio_ready
  );
}
