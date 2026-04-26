// scripts/generate-missing-visual-images.mjs
// Purpose: Generate missing unique final visuals into a review folder.
// Why: Do not overwrite approved final images until humans review the new outputs.

import fs from "node:fs/promises";
import path from "node:path";
import {
  readJson,
  readLeonardoKey,
  readDefaultModel,
  createGeneration,
  pollGeneration,
  downloadImage
} from "./lib/leonardo-missing-image-client.mjs";

const ROOT_DIR = process.cwd();
const VISUALS_ROOT = path.join(ROOT_DIR, "output", "visuals");
const OUTPUT_ROOT = path.join(ROOT_DIR, "output", "images", "missing-unique");

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function logInfo(message) {
  console.log("[INFO] " + message);
}

function safeFileName(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9\-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function loadPromptPackages() {
  const entries = await fs.readdir(VISUALS_ROOT, { withFileTypes: true });
  const packages = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const packagePath = path.join(VISUALS_ROOT, entry.name, "missing-image-prompts.json");

    if (!(await pathExists(packagePath))) continue;

    packages.push(await readJson(packagePath));
  }

  if (packages.length === 0) {
    throw new Error("No missing-image prompt packages found.");
  }

  return packages;
}

async function generatePromptItem(apiKey, model, item) {
  const topicDir = path.join(OUTPUT_ROOT, item.topic_id);
  await fs.mkdir(topicDir, { recursive: true });

  const label = safeFileName(item.suggested_file_label);
  const imageFile = path.join(topicDir, label + ".jpg");
  const manifestFile = path.join(topicDir, label + "-manifest.json");

  if (await pathExists(imageFile)) {
    logInfo("Skipping existing image: " + imageFile);
    return {
      topic_id: item.topic_id,
      label,
      status: "skipped_existing",
      image_file: imageFile
    };
  }

  logInfo("Creating Leonardo generation: " + item.topic_id + " / " + label);

  const created = await createGeneration(apiKey, model, item);
  const polled = await pollGeneration(apiKey, created.generation_id);

  await downloadImage(polled.image_url, imageFile);

  const manifest = {
    topic_id: item.topic_id,
    label,
    status: "generated_missing_unique_for_review",
    planned_slot_number: item.planned_slot_number,
    source_scene_number: item.source_scene_number,
    source_scene_title: item.source_scene_title,
    model_id: model.model_id,
    model_name: model.model_name,
    generation_id: created.generation_id,
    image_url: polled.image_url,
    image_file: imageFile,
    prompt_length: item.prompt.length,
    negative_prompt_length: item.negative_prompt.length,
    prompt: item.prompt,
    negative_prompt: item.negative_prompt,
    poll_attempts: polled.poll_attempts,
    create_response: created.create_response,
    poll_response: polled.poll_response,
    created_at: new Date().toISOString()
  };

  await fs.writeFile(manifestFile, JSON.stringify(manifest, null, 2));

  return {
    topic_id: item.topic_id,
    label,
    status: "generated",
    image_file: imageFile,
    manifest_file: manifestFile
  };
}

async function main() {
  try {
    const apiKey = await readLeonardoKey(ROOT_DIR);
    const model = await readDefaultModel(ROOT_DIR);
    const packages = await loadPromptPackages();
    const results = [];

    logInfo("Leonardo key loaded. Value not printed.");
    logInfo("Using model: " + model.model_name + " / " + model.model_id);

    for (const pkg of packages) {
      const prompts = Array.isArray(pkg.prompts) ? pkg.prompts : [];

      for (const item of prompts) {
        results.push(await generatePromptItem(apiKey, model, item));
      }
    }

    const summaryPath = path.join(OUTPUT_ROOT, "missing-unique-generation-summary.json");
    await fs.mkdir(OUTPUT_ROOT, { recursive: true });

    await fs.writeFile(summaryPath, JSON.stringify({
      status: "complete",
      generated_at: new Date().toISOString(),
      result_count: results.length,
      results
    }, null, 2));

    logInfo("Missing unique generation complete.");
    logInfo("Result count: " + results.length);
    logInfo("Saved summary: " + summaryPath);
  } catch (error) {
    console.error("[ERROR] Missing unique image generation failed: " + error.message);
    process.exitCode = 1;
  }
}

await main();
