// scripts/validate-state.mjs
// Purpose: validate the project state files before any automation runs.
// Why this matters: broken JSON or missing fields can cause the pipeline
// to publish duplicates, skip work incorrectly, or fail halfway through.

import fs from "node:fs/promises";
import path from "node:path";

const ROOT_DIR = process.cwd();

const TOPIC_QUEUE_PATH = path.join(ROOT_DIR, "content", "topic-queue.json");
const PUBLISHED_PATH = path.join(ROOT_DIR, "content", "published.json");

const REQUIRED_TOPIC_FIELDS = [
  "id",
  "title",
  "status",
  "priority",
  "video_type",
  "risk_level",
  "source_notes",
  "created_at"
];

function logInfo(message) {
  console.log([INFO] );
}

function logError(message) {
  console.error([ERROR] );
}

async function readJsonArray(filePath, label) {
  try {
    const rawText = await fs.readFile(filePath, "utf8");

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (jsonError) {
      throw new Error(${label} is not valid JSON: );
    }

    if (!Array.isArray(parsed)) {
      throw new Error(${label} must be a JSON array.);
    }

    return parsed;
  } catch (error) {
    throw new Error(Failed to read : );
  }
}

function validateTopic(topic, index) {
  try {
    for (const field of REQUIRED_TOPIC_FIELDS) {
      if (!(field in topic)) {
        throw new Error(Topic at index  is missing required field: );
      }
    }

    if (typeof topic.id !== "string" || topic.id.trim() === "") {
      throw new Error(Topic at index  must have a non-empty string id.);
    }

    if (typeof topic.title !== "string" || topic.title.trim() === "") {
      throw new Error(Topic at index  must have a non-empty string title.);
    }

    if (!Number.isInteger(topic.priority)) {
      throw new Error(Topic at index  priority must be an integer.);
    }

    if (!Array.isArray(topic.source_notes)) {
      throw new Error(Topic at index  source_notes must be an array.);
    }
  } catch (error) {
    throw new Error(Topic validation failed: );
  }
}

async function main() {
  try {
    logInfo("Validating Ember & Stone state files...");

    const topics = await readJsonArray(TOPIC_QUEUE_PATH, "topic-queue.json");
    const published = await readJsonArray(PUBLISHED_PATH, "published.json");

    topics.forEach(validateTopic);

    logInfo(	opic-queue.json valid. Topic count: );
    logInfo(published.json valid. Published count: );
    logInfo("State validation passed.");
  } catch (error) {
    logError(error.message);
    process.exitCode = 1;
  }
}

await main();
