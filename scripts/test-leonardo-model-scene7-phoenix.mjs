// scripts/test-leonardo-model-scene7-phoenix.mjs
// Purpose: Test Phoenix 1.0 on the hardest scene with simplified visual language.
// Why: SDXL and FLUX drifted into pyramid/object imagery instead of a child hand drawing.

import path from "node:path";
import {
  loadLeonardoKey,
  createLeonardoGeneration,
  pollLeonardoGeneration,
  downloadFile
} from "./lib/leonardo-client.mjs";
import { writeJson, logInfo, logError } from "./lib/json-utils.mjs";

const ROOT_DIR = process.cwd();

const MODEL = {
  name: "Phoenix 1.0",
  id: "de7d3faf-762f-48e0-b3b7-9d0ac3a3fcf3",
  reason: "Model list says it delivers exceptional prompt adherence and text rendering."
};

const WIDTH = 1024;
const HEIGHT = 1024;

function buildPrompt() {
  return [
    "DARK FANTASY LORE ILLUSTRATION.",
    "Single image only. Not a comic panel. Not a storyboard.",
    "Extreme close-up shot.",
    "The foreground must show a small child's hand holding a piece of black charcoal.",
    "The charcoal tip must be touching a rough wooden floor.",
    "The child is actively drawing an irregular black spiral scratch mark on the wooden floor.",
    "The hand, charcoal, floor, and fresh black mark must be the main focal point.",
    "A few old papers nearby show the same rough black spiral mark, but no readable writing.",
    "Dim village room before dawn, eerie quiet horror mood.",
    "Dark fantasy ink illustration, cinematic lighting, high detail, strong focal point.",
    "Do not show a pyramid.",
    "Do not show a triangular object.",
    "Do not show a desk model.",
    "Do not show an empty room.",
    "Do not omit the hand.",
    "Do not omit the charcoal.",
    "Do not omit the mark being drawn.",
    "No readable text, no letters, no logos, no watermark."
  ].join(" ");
}

async function main() {
  try {
    logInfo("Testing " + MODEL.name + " on simplified scene-7 close-up...");

    const apiKey = await loadLeonardoKey(ROOT_DIR);

    const compiledPrompt = buildPrompt();
    const negativePrompt = [
      "pyramid",
      "triangular object",
      "desk model",
      "empty room",
      "adult hand",
      "no hand",
      "text",
      "letters",
      "logos",
      "watermark",
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

    const outputDir = path.join(ROOT_DIR, "output", "images", "model-tests", "phoenix-scene-7");
    const imagePath = path.join(outputDir, "forgotten-god-scene-7.jpg");
    const manifestPath = path.join(outputDir, "manifest.json");

    const createResponse = await createLeonardoGeneration(apiKey, payload);
    const generationId = createResponse.sdGenerationJob.generationId;
    const pollResponse = await pollLeonardoGeneration(apiKey, generationId);
    const image = pollResponse.generations_by_pk.generated_images[0];

    await downloadFile(image.url, imagePath);

    await writeJson(manifestPath, {
      status: "model_test",
      topic_id: "forgotten-god-under-mountain",
      scene_number: 7,
      model: MODEL,
      generation_id: generationId,
      image_id: image.id,
      output_file: imagePath,
      source_url: image.url,
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
