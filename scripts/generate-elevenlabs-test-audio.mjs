// scripts/generate-elevenlabs-test-audio.mjs
// Purpose: Generate a tiny ElevenLabs MP3 test.
// Why: We verify voice permissions and sound before spending credits on full videos.

import path from "node:path";
import { loadRuntimeConfig } from "./lib/api-keys.mjs";
import { postElevenLabsAudio } from "./lib/elevenlabs-client.mjs";
import { logInfo, logError } from "./lib/json-utils.mjs";

const ROOT_DIR = process.cwd();
const OUTPUT_PATH = path.join(ROOT_DIR, "output", "elevenlabs", "test-voice.mp3");

async function main() {
  try {
    logInfo("Generating ElevenLabs test audio...");

    const config = loadRuntimeConfig(ROOT_DIR, {
      requireElevenLabsKey: true
    });

    if (!config.elevenlabsVoiceId) {
      throw new Error("Missing ELEVENLABS_VOICE_ID in APIKeys.txt.");
    }

    const payload = {
      text: "Welcome to Ember and Stone. Tonight, we open the door beneath the mountain.",
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.45,
        similarity_boost: 0.8,
        style: 0.15,
        use_speaker_boost: true
      }
    };

    const apiPath =
      "/v1/text-to-speech/" +
      encodeURIComponent(config.elevenlabsVoiceId) +
      "?output_format=mp3_44100_128";

    await postElevenLabsAudio(config, apiPath, payload, OUTPUT_PATH);

    logInfo("Test audio written: " + OUTPUT_PATH);
  } catch (error) {
    logError(error.message);
    process.exitCode = 1;
  }
}

await main();
