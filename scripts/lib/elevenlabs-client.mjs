// scripts/lib/elevenlabs-client.mjs
// Purpose: Centralize ElevenLabs API calls.
// Why: Voice listing and TTS generation should share one safe client.

import fs from "node:fs/promises";
import path from "node:path";

export async function getElevenLabsJson(config, apiPath) {
  try {
    const response = await fetch(config.elevenlabsEndpoint + apiPath, {
      method: "GET",
      headers: {
        "accept": "application/json",
        "xi-api-key": config.elevenlabsApiKey
      }
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error("ElevenLabs API failed with HTTP " + response.status + ": " + responseText.slice(0, 500));
    }

    return JSON.parse(responseText);
  } catch (error) {
    throw new Error("ElevenLabs GET failed: " + error.message);
  }
}

export async function postElevenLabsAudio(config, apiPath, payload, outputPath) {
  try {
    const response = await fetch(config.elevenlabsEndpoint + apiPath, {
      method: "POST",
      headers: {
        "accept": "audio/mpeg",
        "content-type": "application/json",
        "xi-api-key": config.elevenlabsApiKey
      },
      body: JSON.stringify(payload)
    });

    const arrayBuffer = await response.arrayBuffer();

    if (!response.ok) {
      const errorText = Buffer.from(arrayBuffer).toString("utf8");
      throw new Error("ElevenLabs API failed with HTTP " + response.status + ": " + errorText.slice(0, 500));
    }

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, Buffer.from(arrayBuffer));

    return outputPath;
  } catch (error) {
    throw new Error("ElevenLabs audio POST failed: " + error.message);
  }
}
