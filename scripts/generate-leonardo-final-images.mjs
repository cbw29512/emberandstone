// scripts/generate-leonardo-final-images.mjs
// Purpose: Generate the final image set for the selected launch videos.
// Why: Reuse approved sample images first, then generate only the remaining missing images.

import fs from "node:fs/promises";
import path from "node:path";
import {
  loadLeonardoKey,
  createLeonardoGeneration,
  pollLeonardoGeneration,
  downloadFile
} from "./lib/leonardo-client.mjs";
import { readJson, writeJson, logInfo, logError } from "./lib/json-utils.mjs";

const ROOT_DIR = process.cwd();
const SELECTED_TOPICS_PATH = path.join(ROOT_DIR, "output", "state", "selected-topics.json");
const VISUAL_ROOT = path.join(ROOT_DIR, "output", "visuals");
const SAMPLE_ROOT = path.join(ROOT_DIR, "output", "images", "samples");
const FINAL_ROOT = path.join(ROOT_DIR, "output", "images", "final");

const MODEL_ID = "16e7060a-803e-4df3-97ee-edcfa5dc9cc8"; // SDXL 1.0
const WIDTH = 1024;
const HEIGHT = 1024;

const APPROVED_SAMPLE_PATHS = {
  "city-that-erased-its-own-name": {
    "thumbnail": path.join(SAMPLE_ROOT, "city-that-erased-its-own-name", "thumbnail.jpg"),
    "scene-5": path.join(SAMPLE_ROOT, "city-that-erased-its-own-name", "scene-5.jpg")
  },
  "forgotten-god-under-mountain": {
    "thumbnail": path.join(SAMPLE_ROOT, "forgotten-god-under-mountain", "thumbnail.jpg"),
    "scene-5": path.join(SAMPLE_ROOT, "forgotten-god-under-mountain", "scene-5.jpg")
  }
};

function buildPrompt(basePrompt) {
  return [
    basePrompt,
    "dark fantasy illustration, cinematic composition, strong focal point, moody fog, atmospheric depth, high detail, dramatic light, no readable text, no letters, no logos"
  ].join("\n");
}

function labelFromTarget(target) {
  return target.kind === "thumbnail"
    ? "thumbnail"
    : "scene-" + target.scene_number;
}

function fileNameFromTarget(target) {
  return labelFromTarget(target) + ".jpg";
}

function buildTargets(promptPackage) {
  const targets = [];

  targets.push({
    kind: "thumbnail",
    prompt: promptPackage.thumbnail_prompt
  });

  for (const scene of promptPackage.scenes || []) {
    targets.push({
      kind: "scene",
      scene_number: Number(scene.scene_number),
      scene_title: scene.scene_title,
      prompt: scene.image_prompt
    });
  }

  return targets;
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function reuseApprovedSampleIfAvailable(topicId, label, outputPath) {
  const samplePath = APPROVED_SAMPLE_PATHS[topicId]?.[label];

  if (!samplePath) {
    return null;
  }

  if (!(await pathExists(samplePath))) {
    return null;
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.copyFile(samplePath, outputPath);

  return samplePath;
}

async function writeFinalManifest(topicDir, label, data) {
  const manifestPath = path.join(topicDir, label + "-manifest.json");
  await writeJson(manifestPath, data);
}

async function generateTarget(apiKey, topicId, target) {
  const label = labelFromTarget(target);
  const topicDir = path.join(FINAL_ROOT, topicId);
  const outputPath = path.join(topicDir, fileNameFromTarget(target));

  if (await pathExists(outputPath)) {
    logInfo("Skipping existing final image: " + outputPath);
    return;
  }

  const reusedSample = await reuseApprovedSampleIfAvailable(topicId, label, outputPath);

  if (reusedSample) {
    logInfo("Reused approved sample for: " + topicId + " / " + label);

    await writeFinalManifest(topicDir, label, {
      topic_id: topicId,
      label,
      status: "reused_sample",
      source_sample_path: reusedSample,
      output_file: outputPath,
      created_at: new Date().toISOString()
    });

    return;
  }

  const payload = {
    modelId: MODEL_ID,
    prompt: buildPrompt(target.prompt),
    negative_prompt: "text, letters, logos, watermark, modern objects, copyrighted characters",
    num_images: 1,
    width: WIDTH,
    height: HEIGHT
  };

  logInfo("Generating final image: " + topicId + " / " + label);

  const createResponse = await createLeonardoGeneration(apiKey, payload);
  const generationId = createResponse.sdGenerationJob.generationId;
  const pollResponse = await pollLeonardoGeneration(apiKey, generationId);
  const image = pollResponse.generations_by_pk.generated_images[0];

  await downloadFile(image.url, outputPath);

  await writeFinalManifest(topicDir, label, {
    topic_id: topicId,
    label,
    status: "generated",
    generation_id: generationId,
    model_id: MODEL_ID,
    width: WIDTH,
    height: HEIGHT,
    output_file: outputPath,
    image_id: image.id,
    source_url: image.url,
    created_at: new Date().toISOString()
  });

  logInfo("Saved final image: " + outputPath);
}

async function main() {
  try {
    logInfo("Generating final Leonardo image set...");

    const apiKey = await loadLeonardoKey(ROOT_DIR);
    const selectedState = await readJson(SELECTED_TOPICS_PATH, "selected-topics.json");
    const topics = Array.isArray(selectedState.topics) ? selectedState.topics : [];

    if (topics.length === 0) {
      throw new Error("No selected topics found.");
    }

    for (const topic of topics) {
      const packagePath = path.join(VISUAL_ROOT, topic.id, "image-prompt-package.json");
      const promptPackage = await readJson(packagePath, "image prompt package for " + topic.id);
      const targets = buildTargets(promptPackage);

      for (const target of targets) {
        await generateTarget(apiKey, topic.id, target);
      }
    }

    logInfo("Final Leonardo image generation complete.");
  } catch (error) {
    logError(error.message);
    process.exitCode = 1;
  }
}

await main();
