// scripts/lib/leonardo-client.mjs
// Purpose: Centralize Leonardo image API calls.
// Why: Sample and full image generation need the same create, poll, and download logic.

import fs from "node:fs/promises";
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

    parsed[trimmed.slice(0, equalsIndex).trim()] = trimmed.slice(equalsIndex + 1).trim();
  }

  return parsed;
}

export async function loadLeonardoKey(rootDir) {
  const keyPath = path.join(rootDir, "APIKeys.txt");
  const keys = parseKeyFile(await fs.readFile(keyPath, "utf8"));
  const key = process.env.LEONARDO_API_KEY || keys.LEONARDO_API_KEY || "";

  if (!key) {
    throw new Error("Missing LEONARDO_API_KEY.");
  }

  return key;
}

export async function createLeonardoGeneration(apiKey, payload) {
  const response = await fetch("https://cloud.leonardo.ai/api/rest/v1/generations", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "authorization": "Bearer " + apiKey,
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error("Leonardo create failed HTTP " + response.status + ": " + text.slice(0, 700));
  }

  const json = JSON.parse(text);
  const generationId = json?.sdGenerationJob?.generationId;

  if (!generationId) {
    throw new Error("Leonardo response missing sdGenerationJob.generationId.");
  }

  return json;
}

export async function pollLeonardoGeneration(apiKey, generationId, maxAttempts = 20) {
  let finalResponse = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch("https://cloud.leonardo.ai/api/rest/v1/generations/" + generationId, {
      method: "GET",
      headers: {
        "accept": "application/json",
        "authorization": "Bearer " + apiKey
      }
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error("Leonardo poll failed HTTP " + response.status + ": " + text.slice(0, 700));
    }

    finalResponse = JSON.parse(text);

    const generation = finalResponse.generations_by_pk;
    const status = generation?.status;
    const images = Array.isArray(generation?.generated_images) ? generation.generated_images : [];

    if (status === "COMPLETE" && images.length > 0) {
      return finalResponse;
    }

    if (status === "FAILED") {
      throw new Error("Leonardo generation failed: " + generationId);
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  throw new Error("Leonardo generation did not complete after " + maxAttempts + " attempts.");
}

export async function downloadFile(url, outputPath) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();

  if (!response.ok) {
    throw new Error("Download failed HTTP " + response.status);
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, Buffer.from(arrayBuffer));

  return outputPath;
}
