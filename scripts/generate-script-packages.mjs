// scripts/generate-script-packages.mjs
// Purpose: Build structured script packages for selected topics.
// Why: The paid AI-writing step should receive strict instructions and stable metadata,
// not loose free-form prompts that can drift or ignore safety rules.

import fs from "node:fs/promises";
import path from "node:path";

const ROOT_DIR = process.cwd();
const SELECTED_TOPICS_PATH = path.join(ROOT_DIR, "output", "state", "selected-topics.json");
const CHANNEL_CONFIG_PATH = path.join(ROOT_DIR, "content", "channel-config.json");
const OUTPUT_ROOT = path.join(ROOT_DIR, "output", "scripts");

function logInfo(message) {
  console.log("[INFO] " + message);
}

function logError(message) {
  console.error("[ERROR] " + message);
}

async function readJson(filePath, label) {
  try {
    const rawText = (await fs.readFile(filePath, "utf8")).replace(/^\uFEFF/, "");
    return JSON.parse(rawText);
  } catch (error) {
    throw new Error("Failed to read " + label + ": " + error.message);
  }
}

async function writeJson(filePath, data) {
  try {
    const json = JSON.stringify(data, null, 2) + "\n";
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, json, "utf8");
  } catch (error) {
    throw new Error("Failed to write JSON file: " + error.message);
  }
}

function requireSelectedTopics(selectedState) {
  try {
    if (!selectedState || !Array.isArray(selectedState.topics)) {
      throw new Error("selected-topics.json must contain a topics array.");
    }

    if (selectedState.topics.length === 0) {
      throw new Error("No selected topics found. Run npm run select:topics first.");
    }

    return selectedState.topics;
  } catch (error) {
    throw new Error("Selected topic validation failed: " + error.message);
  }
}

function buildYouTubeMetadata(topic, channelConfig) {
  try {
    const defaults = channelConfig.metadata_defaults || {};
    const channel = channelConfig.channel || {};

    const suffix = defaults.title_suffix || "| Dark Fantasy Lore | Ember & Stone";
    const footer = defaults.description_footer || "";
    const baseTags = Array.isArray(defaults.tags) ? defaults.tags : [];

    return {
      title: topic.title + " " + suffix,
      description:
        topic.title + "\n\n" +
        "An original dark fantasy lore story from " + (channel.name || "Ember & Stone") + ".\n\n" +
        footer,
      tags: baseTags,
      playlist_hint: defaults.playlist_strategy || "Dark Fantasy Lore",
      thumbnail_text: topic.title,
      pinned_comment: defaults.pinned_comment_template || "Would you use this in your campaign?"
    };
  } catch (error) {
    throw new Error("Could not build YouTube metadata: " + error.message);
  }
}

function buildScriptPackage(topic, channelConfig) {
  try {
    const channel = channelConfig.channel || {};

    return {
      topic_id: topic.id,
      topic_title: topic.title,
      video_type: topic.video_type,
      script_status: "package_created",
      target_duration_minutes: 8,
      created_at: new Date().toISOString(),
      youtube_metadata: buildYouTubeMetadata(topic, channelConfig),
      script_requirements: {
        tone: channel.brand_voice || "cinematic, ominous, mythic, clear, story-first",
        structure: [
          "Open with a disturbing mythic hook in the first 10 seconds.",
          "Explain the legend as if it is a recovered forbidden history.",
          "Build mystery through 5 to 7 short scenes.",
          "End with a campaign-ready question or unresolved danger."
        ],
        safety_rules: [
          "Use original dark fantasy lore only.",
          "Do not use official D&D character names, setting names, copied lore, stat blocks, logos, or official art.",
          "Do not imply affiliation with Wizards of the Coast or any official tabletop publisher.",
          "Keep the content useful for TTRPG inspiration without becoming a rules product."
        ]
      },
      scene_plan: [
        "Hook and central mystery",
        "Origin of the place, creature, cult, or curse",
        "First historical warning sign",
        "What people believe incorrectly",
        "The hidden truth",
        "What happens when someone investigates",
        "Final unresolved threat"
      ]
    };
  } catch (error) {
    throw new Error("Could not build script package for " + topic.id + ": " + error.message);
  }
}

async function main() {
  try {
    logInfo("Generating script packages...");

    const selectedState = await readJson(SELECTED_TOPICS_PATH, "selected-topics.json");
    const channelConfig = await readJson(CHANNEL_CONFIG_PATH, "channel-config.json");
    const selectedTopics = requireSelectedTopics(selectedState);

    for (const topic of selectedTopics) {
      const scriptPackage = buildScriptPackage(topic, channelConfig);
      const outputPath = path.join(OUTPUT_ROOT, topic.id, "script-package.json");

      await writeJson(outputPath, scriptPackage);
      logInfo("Created script package: " + outputPath);
    }

    logInfo("Script package generation complete. Count: " + selectedTopics.length);
  } catch (error) {
    logError(error.message);
    process.exitCode = 1;
  }
}

await main();

