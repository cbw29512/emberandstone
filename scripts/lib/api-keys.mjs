// scripts/lib/api-keys.mjs
// Purpose: Load local development keys from APIKeys.txt without committing secrets.
// Why: GitHub Actions will use repository secrets, while local runs can use APIKeys.txt.

import fs from "node:fs";
import path from "node:path";

function parseKeyFile(rawText) {
  const parsed = {};

  for (const line of rawText.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const equalsIndex = trimmed.indexOf("=");

    if (equalsIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1).trim();

    if (key && value) {
      parsed[key] = value;
    }
  }

  return parsed;
}

export function loadRuntimeConfig(rootDir, options = {}) {
  try {
    const apiKeyPath = path.join(rootDir, "APIKeys.txt");

    if (fs.existsSync(apiKeyPath)) {
      const localKeys = parseKeyFile(fs.readFileSync(apiKeyPath, "utf8"));

      for (const [key, value] of Object.entries(localKeys)) {
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }

    const anthropicApiKey = process.env.ANTHROPIC_API_KEY || "";
    const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY || "";

    if (options.requireAnthropicKey === true && !anthropicApiKey) {
      throw new Error("Missing ANTHROPIC_API_KEY.");
    }

    if (options.requireElevenLabsKey === true && !elevenlabsApiKey) {
      throw new Error("Missing ELEVENLABS_API_KEY.");
    }

    return {
      anthropicApiKey,
      anthropicModel: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
      anthropicEndpoint: "https://api.anthropic.com/v1/messages",
      elevenlabsApiKey,
      elevenlabsVoiceId: process.env.ELEVENLABS_VOICE_ID || "",
      elevenlabsEndpoint: "https://api.elevenlabs.io"
    };
  } catch (error) {
    throw new Error("Failed to load runtime config: " + error.message);
  }
}
