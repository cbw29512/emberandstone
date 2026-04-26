// scripts/lib/elevenlabs-audio-core.mjs
// Purpose: Generate one topic's ElevenLabs narration audio.
// Why: The runner should stay thin while this module owns idempotent TTS behavior.

import path from "node:path";
import { postElevenLabsAudio } from "./elevenlabs-client.mjs";
import { readJson, logInfo, logError } from "./json-utils.mjs";
import { readText, fileSizeBytes } from "./audio-file-utils.mjs";
import { writeAudioManifest } from "./audio-manifest-utils.mjs";

function isQuotaError(error) {
  return String(error.message || "").includes("quota_exceeded");
}

function buildPayload(text) {
  return {
    text,
    model_id: "eleven_multilingual_v2",
    voice_settings: {
      stability: 0.45,
      similarity_boost: 0.8,
      style: 0.15,
      use_speaker_boost: true
    }
  };
}

function buildApiPath(config) {
  return (
    "/v1/text-to-speech/" +
    encodeURIComponent(config.elevenlabsVoiceId) +
    "?output_format=mp3_44100_128"
  );
}

export async function generateTopicAudio(topic, config, paths) {
  const topicId = topic.id;
  const voiceDir = path.join(paths.voiceRoot, topicId);
  const audioDir = path.join(paths.audioRoot, topicId);

  const narrationPath = path.join(voiceDir, "narration.txt");
  const voiceManifestPath = path.join(voiceDir, "voice-manifest.json");
  const audioPath = path.join(audioDir, "narration.mp3");
  const audioManifestPath = path.join(audioDir, "audio-manifest.json");

  const voiceManifest = await readJson(voiceManifestPath, "voice-manifest.json for " + topicId);
  const existingBytes = await fileSizeBytes(audioPath);

  if (existingBytes > 0) {
    await writeAudioManifest({
      audioManifestPath,
      topic,
      config,
      voiceManifest,
      bytes: existingBytes,
      status: "generated_existing"
    });

    logInfo("Skipping existing narration audio for: " + topic.title);
    logInfo("Existing MP3 bytes: " + existingBytes);
    return { status: "skipped_existing", topicId };
  }

  const narrationText = (await readText(narrationPath, "narration.txt for " + topicId)).trim();

  if (!narrationText) {
    throw new Error("Narration text is empty for " + topicId);
  }

  try {
    await postElevenLabsAudio(config, buildApiPath(config), buildPayload(narrationText), audioPath);

    const bytes = await fileSizeBytes(audioPath);

    if (bytes <= 0) {
      throw new Error("Generated MP3 is empty for " + topicId);
    }

    await writeAudioManifest({
      audioManifestPath,
      topic,
      config,
      voiceManifest,
      bytes,
      status: "generated"
    });

    logInfo("Generated narration audio for: " + topic.title);
    logInfo("MP3 bytes: " + bytes);
    return { status: "generated", topicId };
  } catch (error) {
    if (isQuotaError(error)) {
      await writeAudioManifest({
        audioManifestPath,
        topic,
        config,
        voiceManifest,
        bytes: 0,
        status: "blocked_quota",
        errorMessage: error.message
      });

      logError("Quota blocked narration audio for: " + topic.title);
      logError(error.message);
      return { status: "blocked_quota", topicId };
    }

    throw new Error("Audio generation failed for " + topicId + ": " + error.message);
  }
}
