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
    const requireAnthropicKey = options.requireAnthropicKey === true;
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
    const anthropicModel = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

    if (requireAnthropicKey && !anthropicApiKey) {
      throw new Error("Missing ANTHROPIC_API_KEY. Add it to APIKeys.txt locally or GitHub Secrets.");
    }

    return {
      anthropicApiKey,
      anthropicModel,
      anthropicEndpoint: "https://api.anthropic.com/v1/messages"
    };
  } catch (error) {
    throw new Error("Failed to load runtime config: " + error.message);
  }
}
