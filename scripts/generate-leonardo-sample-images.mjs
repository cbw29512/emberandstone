// scripts/generate-leonardo-sample-images.mjs
// Purpose: Generate a tiny visual sample set from real prompt packages.
// Why: We judge style before spending money on the full scene batch.

import path from "node:path";
import {
  loadLeonardoKey,
  createLeonardoGeneration,
  pollLeonardoGeneration,
  downloadFile
} from "./lib/leonardo-client.mjs";
import { readJson, writeJson, logInfo, logError } from "./lib/json-utils.mjs";

const ROOT_DIR = process.cwd();
const VISUAL_ROOT = path.join(ROOT_DIR, "output", "visuals");
const SAMPLE_ROOT = path.join(ROOT_DIR, "output", "images", "samples");

const MODEL_ID = "16e7060a-803e-4df3-97ee-edcfa5dc9cc8";
const WIDTH = 1024;
const HEIGHT = 1024;

const SAMPLES = [
  { topicId: "city-that-erased-its-own-name", kind: "thumbnail" },
  { topicId: "city-that-erased-its-own-name", kind: "scene", sceneNumber: 5 },
  { topicId: "forgotten-god-under-mountain", kind: "thumbnail" },
  { topicId: "forgotten-god-under-mountain", kind: "scene", sceneNumber: 5 }
];

function buildPrompt(basePrompt) {
  return [
    basePrompt,
    "dark fantasy illustration, cinematic composition, strong focal point, moody fog, high detail, dramatic light, no readable text, no letters, no logos"
  ].join("\n");
}

function getPrompt(promptPackage, sample) {
  if (sample.kind === "thumbnail") {
    return {
      label: "thumbnail",
      prompt: promptPackage.thumbnail_prompt,
      filename: "thumbnail.jpg"
    };
  }

  const scene = promptPackage.scenes.find((item) => {
    return Number(item.scene_number) === Number(sample.sceneNumber);
  });

  if (!scene) {
    throw new Error("Missing scene " + sample.sceneNumber + " for " + promptPackage.topic_id);
  }

  return {
    label: "scene-" + sample.sceneNumber,
    prompt: scene.image_prompt,
    filename: "scene-" + sample.sceneNumber + ".jpg"
  };
}

async function generateSample(apiKey, sample) {
  const packagePath = path.join(VISUAL_ROOT, sample.topicId, "image-prompt-package.json");
  const promptPackage = await readJson(packagePath, "image prompt package for " + sample.topicId);
  const samplePrompt = getPrompt(promptPackage, sample);

  const payload = {
    modelId: MODEL_ID,
    prompt: buildPrompt(samplePrompt.prompt),
    negative_prompt: "text, letters, logos, watermark, modern objects, copyrighted characters",
    num_images: 1,
    width: WIDTH,
    height: HEIGHT
  };

  logInfo("Creating Leonardo sample: " + sample.topicId + " / " + samplePrompt.label);

  const createResponse = await createLeonardoGeneration(apiKey, payload);
  const generationId = createResponse.sdGenerationJob.generationId;

  logInfo("Generation ID: " + generationId);

  const pollResponse = await pollLeonardoGeneration(apiKey, generationId);
  const image = pollResponse.generations_by_pk.generated_images[0];
  const outputPath = path.join(SAMPLE_ROOT, sample.topicId, samplePrompt.filename);
  const manifestPath = path.join(SAMPLE_ROOT, sample.topicId, samplePrompt.label + "-manifest.json");

  await downloadFile(image.url, outputPath);

  await writeJson(manifestPath, {
    topic_id: sample.topicId,
    sample_type: samplePrompt.label,
    generation_id: generationId,
    model_id: MODEL_ID,
    width: WIDTH,
    height: HEIGHT,
    output_file: outputPath,
    image_id: image.id,
    source_url: image.url,
    created_at: new Date().toISOString()
  });

  logInfo("Saved sample image: " + outputPath);
}

async function main() {
  try {
    logInfo("Generating Leonardo sample images...");

    const apiKey = await loadLeonardoKey(ROOT_DIR);

    for (const sample of SAMPLES) {
      await generateSample(apiKey, sample);
    }

    logInfo("Leonardo sample image generation complete.");
  } catch (error) {
    logError(error.message);
    process.exitCode = 1;
  }
}

await main();
