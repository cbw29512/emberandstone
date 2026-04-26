// scripts/list-elevenlabs-voices.mjs
// Purpose: List available ElevenLabs voices and models.
// Why: We need a voice_id before generating paid narration audio.

import path from "node:path";
import { loadRuntimeConfig } from "./lib/api-keys.mjs";
import { getElevenLabsJson } from "./lib/elevenlabs-client.mjs";
import { writeJson, logInfo, logError } from "./lib/json-utils.mjs";

const ROOT_DIR = process.cwd();
const OUTPUT_DIR = path.join(ROOT_DIR, "output", "elevenlabs");

function summarizeVoices(voicesResponse) {
  const voices = Array.isArray(voicesResponse.voices) ? voicesResponse.voices : [];

  return voices.map((voice) => {
    return {
      voice_id: voice.voice_id,
      name: voice.name,
      category: voice.category || null,
      description: voice.description || null,
      labels: voice.labels || {},
      preview_url: voice.preview_url || null
    };
  });
}

function summarizeModels(modelsResponse) {
  const models = Array.isArray(modelsResponse) ? modelsResponse : [];

  return models.map((model) => {
    return {
      model_id: model.model_id,
      name: model.name,
      can_do_text_to_speech: model.can_do_text_to_speech === true
    };
  });
}

async function main() {
  try {
    logInfo("Listing ElevenLabs voices and models...");

    const config = loadRuntimeConfig(ROOT_DIR, {
      requireElevenLabsKey: true
    });

    const voicesResponse = await getElevenLabsJson(config, "/v1/voices?show_legacy=false");
    const modelsResponse = await getElevenLabsJson(config, "/v1/models");

    const voices = summarizeVoices(voicesResponse);
    const models = summarizeModels(modelsResponse);

    await writeJson(path.join(OUTPUT_DIR, "voices.json"), voices);
    await writeJson(path.join(OUTPUT_DIR, "models.json"), models);

    logInfo("Voice count: " + voices.length);
    logInfo("Text-to-speech model count: " + models.filter((model) => model.can_do_text_to_speech).length);

    voices.slice(0, 20).forEach((voice, index) => {
      console.log(
        String(index + 1).padStart(2, "0") +
        ". " +
        voice.name +
        " | " +
        voice.voice_id +
        " | " +
        (voice.category || "uncategorized")
      );
    });

    logInfo("Saved voice list to output/elevenlabs/voices.json");
  } catch (error) {
    logError(error.message);
    process.exitCode = 1;
  }
}

await main();
