// scripts/repair-ai-script-json.mjs
// Purpose: Repair malformed AI JSON output for one topic.
// Why: Long AI generations sometimes contain one malformed quote/comma.
// This script preserves the content while forcing it into valid JSON.

import fs from "node:fs/promises";
import path from "node:path";
import { readJson, writeJson, writeText, logInfo, logError } from "./lib/json-utils.mjs";
import { loadRuntimeConfig } from "./lib/api-keys.mjs";
import { callAnthropicMessage } from "./lib/anthropic-client.mjs";

const ROOT_DIR = process.cwd();
const topicId = process.argv[2];

if (!topicId) {
  logError("Missing topic id. Example: node scripts/repair-ai-script-json.mjs city-that-erased-its-own-name");
  process.exit(1);
}

const topicDir = path.join(ROOT_DIR, "output", "scripts", topicId);
const rawPath = path.join(topicDir, "ai-response-raw.txt");
const packagePath = path.join(topicDir, "script-package.json");
const repairedRawPath = path.join(topicDir, "ai-response-repaired.txt");
const draftPath = path.join(topicDir, "script-draft.json");

function parseJsonObject(text) {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found.");
  }

  return JSON.parse(trimmed.slice(start, end + 1));
}

function buildRepairPrompt(scriptPackage, brokenText) {
  return JSON.stringify({
    task: "Repair this malformed JSON into strict valid JSON.",
    rules: [
      "Return only one valid JSON object.",
      "Do not use markdown.",
      "Do not explain the repair.",
      "Preserve the story, scenes, tags, and metadata as much as possible.",
      "Escape quotes and newlines correctly.",
      "The repaired JSON must match the required output shape."
    ],
    required_output_shape: {
      topic_id: "string",
      final_video_title: "string",
      hook: "string",
      narration_script: "string",
      scenes: [
        {
          scene_number: "number",
          scene_title: "string",
          narration_summary: "string",
          visual_prompt: "string"
        }
      ],
      youtube_description: "string",
      youtube_tags: ["string"],
      pinned_comment: "string"
    },
    script_package: scriptPackage,
    malformed_model_output: brokenText
  }, null, 2);
}

async function main() {
  try {
    logInfo("Repairing AI script JSON for: " + topicId);

    const runtimeConfig = loadRuntimeConfig(ROOT_DIR, {
      requireAnthropicKey: true
    });

    const scriptPackage = await readJson(packagePath, "script-package.json");
    const brokenText = await fs.readFile(rawPath, "utf8");

    try {
      const alreadyValid = parseJsonObject(brokenText);
      await writeJson(draftPath, alreadyValid);
      logInfo("Raw response was already valid after extraction. Draft written.");
      return;
    } catch {
      logInfo("Raw response is malformed. Sending repair request...");
    }

    const response = await callAnthropicMessage(runtimeConfig, {
      system: "You repair malformed JSON. Return strict JSON only.",
      prompt: buildRepairPrompt(scriptPackage, brokenText),
      maxTokens: 6000
    });

    await writeText(repairedRawPath, response.text);

    const repairedJson = parseJsonObject(response.text);
    await writeJson(draftPath, repairedJson);

    logInfo("Repaired script draft written: " + draftPath);
  } catch (error) {
    logError(error.message);
    process.exitCode = 1;
  }
}

await main();
