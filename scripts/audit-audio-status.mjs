// scripts/audit-audio-status.mjs
// Purpose: Audit local audio outputs without calling ElevenLabs.
// Why: We need to know which videos can move forward without spending credits.

import path from "node:path";
import { readJson, logInfo, logError } from "./lib/json-utils.mjs";
import { fileSizeBytes } from "./lib/audio-file-utils.mjs";

const ROOT_DIR = process.cwd();
const SELECTED_TOPICS_PATH = path.join(ROOT_DIR, "output", "state", "selected-topics.json");
const AUDIO_ROOT = path.join(ROOT_DIR, "output", "audio");

async function auditTopic(topic) {
  const audioPath = path.join(AUDIO_ROOT, topic.id, "narration.mp3");
  const manifestPath = path.join(AUDIO_ROOT, topic.id, "audio-manifest.json");

  const bytes = await fileSizeBytes(audioPath);
  let status = "missing";

  try {
    const manifest = await readJson(manifestPath, "audio-manifest.json for " + topic.id);
    status = manifest.audio_status || status;
  } catch {
    status = bytes > 0 ? "generated_without_manifest" : "missing";
  }

  logInfo(topic.title + " | status: " + status + " | bytes: " + bytes);
  return { topicId: topic.id, status, bytes };
}

async function main() {
  try {
    logInfo("Auditing local audio status...");

    const selectedState = await readJson(SELECTED_TOPICS_PATH, "selected-topics.json");
    const selectedTopics = Array.isArray(selectedState.topics) ? selectedState.topics : [];

    if (selectedTopics.length === 0) {
      throw new Error("No selected topics found.");
    }

    const results = [];

    for (const topic of selectedTopics) {
      results.push(await auditTopic(topic));
    }

    const available = results.filter((result) => result.bytes > 0).length;
    logInfo("Local audio available count: " + available);

    if (available === 0) {
      throw new Error("No local audio files are available.");
    }
  } catch (error) {
    logError(error.message);
    process.exitCode = 1;
  }
}

await main();
