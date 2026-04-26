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
import { readChannelStyle, buildChannelStylePrompt } from "./lib/channel-style.mjs";
import { compileBeatLockedPrompt } from "./lib/image-prompt-compiler.mjs";

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

function buildPrompt(target, channelStylePrompt = "") {
  const extraStyle = "dark fantasy illustration, cinematic composition, strong focal point, moody fog, atmospheric depth, high detail, dramatic light, no readable text, no letters, no logos";

  const scenePrompt = target.beat_lock
    ? compileBeatLockedPrompt(target.beat_lock, extraStyle)
    : [target.prompt, extraStyle].join("\n");

  return [channelStylePrompt, scenePrompt].filter(Boolean).join(" ");
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
    prompt: promptPackage.thumbnail_prompt,
    beat_lock: promptPackage.thumbnail_beat_lock
  });

  for (const scene of promptPackage.scenes || []) {
    targets.push({
      kind: "scene",
      scene_number: Number(scene.scene_number),
      scene_title: scene.scene_title,
      prompt: scene.image_prompt,
      beat_lock: scene.beat_lock
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

async function generateTarget(apiKey, topicId, target, channelStylePrompt) {
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

  const compiledPrompt = buildPrompt(target, channelStylePrompt);
  const negativePrompt = "text, letters, logos, watermark, modern objects, copyrighted characters";

  const payload = {
    modelId: MODEL_ID,
    prompt: compiledPrompt,
    negative_prompt: negativePrompt,
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
    channel_style_used: Boolean(channelStylePrompt),
    beat_lock_used: Boolean(target.beat_lock),
    compiled_prompt: compiledPrompt,
    negative_prompt: negativePrompt,
    created_at: new Date().toISOString()
  });

  logInfo("Saved final image: " + outputPath);
}

async function main() {
  try {
    logInfo("Generating final Leonardo image set...");

    const apiKey = await loadLeonardoKey(ROOT_DIR);
    const channelStyle = await readChannelStyle(ROOT_DIR);
    const channelStylePrompt = buildChannelStylePrompt(channelStyle);
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
        await generateTarget(apiKey, topic.id, target, channelStylePrompt);
      }
    }

    logInfo("Final Leonardo image generation complete.");
  } catch (error) {
    logError(error.message);
    process.exitCode = 1;
  }
}

await main();
