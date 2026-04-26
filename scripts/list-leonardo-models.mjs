// scripts/list-leonardo-models.mjs
// Purpose: Verify Leonardo API access by listing platform models.
// Why: This checks the API key without generating paid images.

import fs from "node:fs/promises";
import path from "node:path";

const ROOT_DIR = process.cwd();
const KEY_PATH = path.join(ROOT_DIR, "APIKeys.txt");
const OUTPUT_PATH = path.join(ROOT_DIR, "output", "leonardo", "platform-models.json");

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

    parsed[trimmed.slice(0, equalsIndex).trim()] = trimmed.slice(equalsIndex + 1).trim();
  }

  return parsed;
}

async function loadLeonardoKey() {
  try {
    const localKeys = parseKeyFile(await fs.readFile(KEY_PATH, "utf8"));
    const key = process.env.LEONARDO_API_KEY || localKeys.LEONARDO_API_KEY || "";

    if (!key) {
      throw new Error("Missing LEONARDO_API_KEY.");
    }

    return key;
  } catch (error) {
    throw new Error("Failed to load Leonardo key: " + error.message);
  }
}

async function main() {
  try {
    console.log("[INFO] Listing Leonardo platform models...");

    const apiKey = await loadLeonardoKey();

    const response = await fetch("https://cloud.leonardo.ai/api/rest/v1/platformModels", {
      method: "GET",
      headers: {
        "accept": "application/json",
        "authorization": "Bearer " + apiKey
      }
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error("Leonardo API failed with HTTP " + response.status + ": " + responseText.slice(0, 700));
    }

    await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    await fs.writeFile(OUTPUT_PATH, responseText, "utf8");

    const json = JSON.parse(responseText);
    const models = Array.isArray(json.custom_models) ? json.custom_models : [];
    const fallbackModels = Array.isArray(json.models) ? json.models : [];
    const list = models.length > 0 ? models : fallbackModels;

    console.log("[INFO] Leonardo model count: " + list.length);

    list.slice(0, 10).forEach((model, index) => {
      console.log(
        String(index + 1).padStart(2, "0") +
        ". " +
        (model.name || model.model_name || "Unnamed model") +
        " | " +
        (model.id || model.modelId || model.model_id || "no-id")
      );
    });

    console.log("[INFO] Saved: " + OUTPUT_PATH);
  } catch (error) {
    console.error("[ERROR] " + error.message);
    process.exitCode = 1;
  }
}

await main();
