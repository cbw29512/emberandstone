// scripts/generate-elevenlabs-narration-audio.mjs
// Purpose: Generate full narration MP3 files.
// Why: This runner stays small; the idempotent TTS logic lives in scripts/lib.

import path from "node:path";
import { loadRuntimeConfig } from "./lib/api-keys.mjs";
import { readJson, logInfo, logError } from "./lib/json-utils.mjs";
import { generateTopicAudio } from "./lib/elevenlabs-audio-core.mjs";

const ROOT_DIR = process.cwd();
const SELECTED_TOPICS_PATH = path.join(ROOT_DIR, "output", "state", "selected-topics.json");
const VOICE_ROOT = path.join(ROOT_DIR, "output", "voice");
const AUDIO_ROOT = path.join(ROOT_DIR, "output", "audio");

async function main() {
  try {
    logInfo("Generating ElevenLabs narration audio...");

    const config = loadRuntimeConfig(ROOT_DIR, {
      requireElevenLabsKey: true
    });

    if (!config.elevenlabsVoiceId) {
      throw new Error("Missing ELEVENLABS_VOICE_ID in APIKeys.txt.");
    }

    const selectedState = await readJson(SELECTED_TOPICS_PATH, "selected-topics.json");
    const selectedTopics = Array.isArray(selectedState.topics) ? selectedState.topics : [];

    if (selectedTopics.length === 0) {
      throw new Error("No selected topics found. Run npm run select:topics first.");
    }

    const results = [];

    for (const topic of selectedTopics) {
      results.push(await generateTopicAudio(topic, config, {
        voiceRoot: VOICE_ROOT,
        audioRoot: AUDIO_ROOT
      }));
    }

    const available = results.filter((result) => {
      return ["generated", "skipped_existing"].includes(result.status);
    }).length;

    const blocked = results.filter((result) => result.status === "blocked_quota").length;

    logInfo("Audio available count: " + available);
    logInfo("Audio quota-blocked count: " + blocked);

    if (available === 0) {
      throw new Error("No narration audio is available. Check ElevenLabs quota.");
    }

    logInfo("Narration audio generation finished with available audio.");
  } catch (error) {
    logError(error.message);
    process.exitCode = 1;
  }
}

await main();
