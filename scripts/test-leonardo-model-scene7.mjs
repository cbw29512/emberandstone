// scripts/test-leonardo-model-scene7.mjs
// Purpose: Test one hard story-beat image with a different Leonardo model.
// Why: SDXL produced good mood art but failed exact scene control.

import path from "node:path";
import {
  loadLeonardoKey,
  createLeonardoGeneration,
  pollLeonardoGeneration,
  downloadFile
} from "./lib/leonardo-client.mjs";
import { readJson, writeJson, logInfo, logError } from "./lib/json-utils.mjs";
import { compileBeatLockedPrompt } from "./lib/image-prompt-compiler.mjs";

const ROOT_DIR = process.cwd();
const TOPIC_ID = "forgotten-god-under-mountain";
const SCENE_NUMBER = 7;

const MODEL = {
  name: "FLUX.1 Kontext",
  id: "28aeddf8-bd19-4803-80fc-79602d1a9989",
  reason: "Model list says it is built for precise, controllable image generation and editing."
};

const WIDTH = 1024;
const HEIGHT = 1024;

function findScene(promptPackage) {
  const scene = promptPackage.scenes.find((item) => {
    return Number(item.scene_number) === SCENE_NUMBER;
  });

  if (!scene) {
    throw new Error("Missing scene " + SCENE_NUMBER + " for " + TOPIC_ID);
  }

  if (!scene.beat_lock) {
    throw new Error("Scene is missing beat_lock.");
  }

  return scene;
}

function buildExtraStyle() {
  return [
    "single image only, not a comic panel, not a storyboard",
    "dark fantasy illustration",
    "tight close-up composition",
    "child hand must be visible in the foreground",
    "charcoal touching the floor must be visible",
    "the symbol must be actively being drawn",
    "no pyramid object",
    "no empty room",
    "no readable text",
    "no letters",
    "no logos"
  ].join(", ");
}

async function main() {
  try {
    logInfo("Testing " + MODEL.name + " on one hard scene beat...");

    const apiKey = await loadLeonardoKey(ROOT_DIR);
    const packagePath = path.join(ROOT_DIR, "output", "visuals", TOPIC_ID, "image-prompt-package.json");
    const promptPackage = await readJson(packagePath, "image prompt package for " + TOPIC_ID);
    const scene = findScene(promptPackage);

    const compiledPrompt = compileBeatLockedPrompt(scene.beat_lock, buildExtraStyle());
    const negativePrompt = [
      "text",
      "letters",
      "logos",
      "watermark",
      "pyramid",
      "desk model",
      "empty room",
      "adult hand only",
      "modern objects",
      "modern clothing",
      "comic panels",
      "storyboard panels"
    ].join(", ");

    const payload = {
      modelId: MODEL.id,
      prompt: compiledPrompt,
      negative_prompt: negativePrompt,
      num_images: 1,
      width: WIDTH,
      height: HEIGHT
    };

    const outputDir = path.join(ROOT_DIR, "output", "images", "model-tests", "flux-kontext-scene-7");
    const imagePath = path.join(outputDir, "forgotten-god-scene-7.jpg");
    const manifestPath = path.join(outputDir, "manifest.json");

    const createResponse = await createLeonardoGeneration(apiKey, payload);
    const generationId = createResponse.sdGenerationJob.generationId;
    const pollResponse = await pollLeonardoGeneration(apiKey, generationId);
    const image = pollResponse.generations_by_pk.generated_images[0];

    await downloadFile(image.url, imagePath);

    await writeJson(manifestPath, {
      status: "model_test",
      topic_id: TOPIC_ID,
      scene_number: SCENE_NUMBER,
      model: MODEL,
      generation_id: generationId,
      image_id: image.id,
      output_file: imagePath,
      source_url: image.url,
      beat_lock_used: true,
      compiled_prompt: compiledPrompt,
      negative_prompt: negativePrompt,
      created_at: new Date().toISOString()
    });

    logInfo("Saved test image: " + imagePath);
    logInfo("Saved manifest: " + manifestPath);
  } catch (error) {
    logError(error.message);
    process.exitCode = 1;
  }
}

await main();
