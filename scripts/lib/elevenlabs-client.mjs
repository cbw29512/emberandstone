// scripts/lib/elevenlabs-client.mjs
// Purpose: Centralize ElevenLabs API calls.
// Why: Voice listing and later TTS generation should share one safe client.

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
