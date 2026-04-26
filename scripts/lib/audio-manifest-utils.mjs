// scripts/lib/audio-manifest-utils.mjs
// Purpose: Write consistent audio manifests.
// Why: Generated and blocked audio states need one shared schema.

import { writeJson } from "./json-utils.mjs";

export async function writeAudioManifest(options) {
  try {
    const manifest = {
      topic_id: options.topic.id,
      topic_title: options.topic.title,
      audio_status: options.status,
      provider: "elevenlabs",
      voice_id: options.config.elevenlabsVoiceId,
      model_id: "eleven_multilingual_v2",
      source_voice_manifest: "output/voice/" + options.topic.id + "/voice-manifest.json",
      output_file: "narration.mp3",
      bytes: options.bytes,
      estimated_minutes: options.voiceManifest.estimated_minutes,
      word_count: options.voiceManifest.word_count,
      error_message: options.errorMessage || null,
      updated_at: new Date().toISOString()
    };

    await writeJson(options.audioManifestPath, manifest);
  } catch (error) {
    throw new Error("Failed to write audio manifest: " + error.message);
  }
}
