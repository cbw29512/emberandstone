// scripts/generate-ai-scripts.mjs
// Purpose: Generate AI-ready prompts and, when keys are present, script drafts.
// Why: The pipeline needs strict, repeatable prompts before voice/image/video automation.

import path from "node:path";
import { readJson, writeJson, writeText, logInfo, logError } from "./lib/json-utils.mjs";
import { loadRuntimeConfig } from "./lib/api-keys.mjs";
import { callAnthropicMessage } from "./lib/anthropic-client.mjs";

const ROOT_DIR = process.cwd();
const SELECTED_TOPICS_PATH = path.join(ROOT_DIR, "output", "state", "selected-topics.json");
const SCRIPT_OUTPUT_ROOT = path.join(ROOT_DIR, "output", "scripts");

const isDryRun = process.argv.includes("--dry-run");

function buildSystemPrompt() {
  return [
    "You are the lead writer for Ember & Stone, a faceless dark fantasy lore channel.",
    "Write original fantasy lore only.",
    "Do not use official D&D names, settings, characters, copied lore, stat blocks, logos, or official art.",
    "Return strict JSON only. No markdown. No commentary outside JSON."
  ].join(" ");
}

function buildUserPrompt(scriptPackage) {
  return JSON.stringify({
    task: "Create a complete longform dark fantasy lore video script package.",
    required_output_format: {
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
    quality_rules: [
      "Open with a strong hook within the first 10 seconds.",
      "Use vivid but clear language.",
      "Make the story useful as TTRPG inspiration.",
      "Avoid filler, generic fantasy soup, and slow introductions.",
      "Target roughly 8 minutes of narration."
    ]
  }, null, 2);
}

function parseStrictJson(text, topicId) {
  try {
    const trimmed = text.trim();
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
      throw new Error("No JSON object found in model output.");
    }

    return JSON.parse(trimmed.slice(start, end + 1));
  } catch (error) {
    throw new Error("Could not parse AI script JSON for " + topicId + ": " + error.message);
  }
}

async function processTopic(topic, runtimeConfig) {
  const topicId = topic.id;
  const topicDir = path.join(SCRIPT_OUTPUT_ROOT, topicId);
  const scriptPackagePath = path.join(topicDir, "script-package.json");
  const promptPath = path.join(topicDir, "ai-prompt.txt");
  const rawResponsePath = path.join(topicDir, "ai-response-raw.txt");
  const draftPath = path.join(topicDir, "script-draft.json");

  const scriptPackage = await readJson(scriptPackagePath, "script-package.json for " + topicId);
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(scriptPackage);

  await writeText(promptPath, systemPrompt + "\n\n" + userPrompt);

  if (isDryRun) {
    logInfo("Dry run prompt created for: " + topic.title);
    return;
  }

  const response = await callAnthropicMessage(runtimeConfig, {
    system: systemPrompt,
    prompt: userPrompt,
    maxTokens: 6000
  });

  await writeText(rawResponsePath, response.text);

  const parsedDraft = parseStrictJson(response.text, topicId);
  await writeJson(draftPath, parsedDraft);

  logInfo("AI script draft created for: " + topic.title);
}

async function main() {
  try {
    logInfo(isDryRun ? "Generating AI prompts only..." : "Generating live AI scripts...");

    const selectedState = await readJson(SELECTED_TOPICS_PATH, "selected-topics.json");
    const selectedTopics = Array.isArray(selectedState.topics) ? selectedState.topics : [];

    if (selectedTopics.length === 0) {
      throw new Error("No selected topics found. Run npm run select:topics first.");
    }

    const runtimeConfig = loadRuntimeConfig(ROOT_DIR, {
      requireAnthropicKey: !isDryRun
    });

    logInfo("Anthropic model: " + runtimeConfig.anthropicModel);

    for (const topic of selectedTopics) {
      await processTopic(topic, runtimeConfig);
    }

    logInfo(isDryRun ? "AI prompt generation complete." : "AI script generation complete.");
  } catch (error) {
    logError(error.message);
    process.exitCode = 1;
  }
}

await main();
