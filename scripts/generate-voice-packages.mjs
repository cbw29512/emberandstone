// scripts/generate-voice-packages.mjs
// Purpose: Extract narration text from AI script drafts and prepare TTS input packages.
// Why: Voice generation should receive clean narration only, not metadata or scene JSON.

import fs from "node:fs/promises";
import path from "node:path";
import { readJson, writeJson, writeText, logInfo, logError } from "./lib/json-utils.mjs";

const ROOT_DIR = process.cwd();
const SELECTED_TOPICS_PATH = path.join(ROOT_DIR, "output", "state", "selected-topics.json");
const SCRIPT_OUTPUT_ROOT = path.join(ROOT_DIR, "output", "scripts");
const VOICE_OUTPUT_ROOT = path.join(ROOT_DIR, "output", "voice");

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function countWords(text) {
  try {
    return text.trim().split(/\s+/).filter(Boolean).length;
  } catch {
    return 0;
  }
}

function estimateMinutes(wordCount) {
  try {
    const wordsPerMinute = 145;
    return Math.round((wordCount / wordsPerMinute) * 10) / 10;
  } catch {
    return 0;
  }
}

function validateDraft(draft, topicId) {
  try {
    if (!draft || typeof draft !== "object") {
      throw new Error("Draft must be an object.");
    }

    if (typeof draft.narration_script !== "string" || draft.narration_script.trim() === "") {
      throw new Error("Missing non-empty narration_script.");
    }

    if (typeof draft.final_video_title !== "string" || draft.final_video_title.trim() === "") {
      throw new Error("Missing final_video_title.");
    }

    return true;
  } catch (error) {
    throw new Error("Invalid script draft for " + topicId + ": " + error.message);
  }
}

function buildVoiceManifest(topic, draft, narrationText, draftSource) {
  const wordCount = countWords(narrationText);

  return {
    topic_id: topic.id,
    topic_title: topic.title,
    final_video_title: draft.final_video_title,
    voice_status: "package_created",
    draft_source: draftSource,
    narration_file: "narration.txt",
    word_count: wordCount,
    estimated_minutes: estimateMinutes(wordCount),
    tts_provider: "elevenlabs",
    tts_voice_style: "deep cinematic documentary narrator",
    created_at: new Date().toISOString()
  };
}

async function processTopic(topic) {
  try {
    const topicId = topic.id;
    const tightenedDraftPath = path.join(SCRIPT_OUTPUT_ROOT, topicId, "script-draft-tightened.json");
    const fallbackDraftPath = path.join(SCRIPT_OUTPUT_ROOT, topicId, "script-draft.json");
    const useTightened = await fileExists(tightenedDraftPath);
    const draftPath = useTightened ? tightenedDraftPath : fallbackDraftPath;
    const draftSource = useTightened ? "script-draft-tightened.json" : "script-draft.json";

    const voiceDir = path.join(VOICE_OUTPUT_ROOT, topicId);
    const narrationPath = path.join(voiceDir, "narration.txt");
    const manifestPath = path.join(voiceDir, "voice-manifest.json");

    const draft = await readJson(draftPath, draftSource + " for " + topicId);
    validateDraft(draft, topicId);

    const narrationText = draft.narration_script.trim() + "\n";
    const manifest = buildVoiceManifest(topic, draft, narrationText, draftSource);

    await writeText(narrationPath, narrationText);
    await writeJson(manifestPath, manifest);

    logInfo("Created voice package for: " + topic.title);
    logInfo("Draft source: " + draftSource);
    logInfo("Word count: " + manifest.word_count);
    logInfo("Estimated minutes: " + manifest.estimated_minutes);
  } catch (error) {
    throw new Error("Voice package failed: " + error.message);
  }
}

async function main() {
  try {
    logInfo("Generating voice packages...");

    const selectedState = await readJson(SELECTED_TOPICS_PATH, "selected-topics.json");
    const selectedTopics = Array.isArray(selectedState.topics) ? selectedState.topics : [];

    if (selectedTopics.length === 0) {
      throw new Error("No selected topics found. Run npm run select:topics first.");
    }

    for (const topic of selectedTopics) {
      await processTopic(topic);
    }

    logInfo("Voice package generation complete. Count: " + selectedTopics.length);
  } catch (error) {
    logError(error.message);
    process.exitCode = 1;
  }
}

await main();
