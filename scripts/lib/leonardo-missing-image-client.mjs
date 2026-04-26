// scripts/lib/leonardo-missing-image-client.mjs
// Purpose: Generate missing unique Ember & Stone visuals with Leonardo.
// Why: Public videos need unique script-relevant images instead of repeated frames.

import fs from "node:fs/promises";
import path from "node:path";

function fail(message) {
  throw new Error(message);
}

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function stripBom(value) {
  return String(value || "").replace(/^\uFEFF/, "");
}

export async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(stripBom(raw));
}

export async function readLeonardoKey(rootDir) {
  const keyPath = path.join(rootDir, "APIKeys.txt");
  const raw = await fs.readFile(keyPath, "utf8");
  const line = raw.split(/\r?\n/).find((item) => item.trim().startsWith("LEONARDO_API_KEY="));

  if (!line) {
    fail("LEONARDO_API_KEY line missing from APIKeys.txt.");
  }

  const apiKey = line.replace(/^LEONARDO_API_KEY=/, "").trim();

  if (!apiKey || /paste_|your_|here/i.test(apiKey)) {
    fail("LEONARDO_API_KEY is empty or still looks like a placeholder.");
  }

  return apiKey;
}

export async function readDefaultModel(rootDir) {
  const policyPath = path.join(rootDir, "content", "image-model-policy.json");
  const policy = await readJson(policyPath);

  if (!clean(policy.default_model_id)) {
    fail("image-model-policy.json missing default_model_id.");
  }

  return {
    model_id: clean(policy.default_model_id),
    model_name: clean(policy.default_model_name) || "unknown"
  };
}

async function apiFetch(apiKey, url, options = {}) {
  if (typeof fetch !== "function") {
    fail("Node fetch is unavailable. Use Node 18+.");
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      accept: "application/json",
      authorization: "Bearer " + apiKey,
      "content-type": "application/json",
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw_response_text: text };
  }

  if (!response.ok) {
    fail("Leonardo API failed with " + response.status + ": " + text);
  }

  return data;
}

export async function createGeneration(apiKey, model, promptItem) {
  const body = {
    modelId: model.model_id,
    prompt: promptItem.prompt,
    negative_prompt: promptItem.negative_prompt,
    num_images: 1,
    width: 1024,
    height: 1024
  };

  const data = await apiFetch(apiKey, "https://cloud.leonardo.ai/api/rest/v1/generations", {
    method: "POST",
    body: JSON.stringify(body)
  });

  const generationId =
    data?.sdGenerationJob?.generationId ||
    data?.generationId ||
    data?.id ||
    "";

  if (!generationId) {
    fail("Leonardo create response did not include a generation id.");
  }

  return {
    generation_id: generationId,
    create_response: data
  };
}

function extractGenerationNode(data) {
  return data?.generations_by_pk || data?.generation || data?.sdGenerationJob || data || {};
}

function extractImageUrl(data) {
  const node = extractGenerationNode(data);
  const images =
    node.generated_images ||
    node.images ||
    data.generated_images ||
    data.images ||
    [];

  const first = Array.isArray(images) ? images[0] : null;

  return clean(first?.url || first?.image_url || first?.imageUrl || "");
}

export async function pollGeneration(apiKey, generationId) {
  const url = "https://cloud.leonardo.ai/api/rest/v1/generations/" + generationId;
  let lastData = null;

  for (let attempt = 1; attempt <= 90; attempt += 1) {
    const data = await apiFetch(apiKey, url, { method: "GET" });
    lastData = data;

    const imageUrl = extractImageUrl(data);

    if (imageUrl) {
      return {
        image_url: imageUrl,
        poll_response: data,
        poll_attempts: attempt
      };
    }

    await new Promise((resolve) => setTimeout(resolve, 4000));
  }

  fail("Timed out waiting for Leonardo generation: " + generationId + ". Last response: " + JSON.stringify(lastData));
}

export async function downloadImage(imageUrl, outputFile) {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    fail("Image download failed with " + response.status + ": " + imageUrl);
  }

  const arrayBuffer = await response.arrayBuffer();
  await fs.writeFile(outputFile, Buffer.from(arrayBuffer));
}
