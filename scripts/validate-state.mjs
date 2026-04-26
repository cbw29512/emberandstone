// scripts/validate-state.mjs
// Purpose: Validate Ember & Stone state files before automation runs.
// Why: Bad JSON or missing fields can break the pipeline, cause duplicate topics,
// or corrupt publishing state.

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
  console.log("[INFO] " + message);
}

function logError(message) {
  console.error("[ERROR] " + message);
}

async function readJsonArray(filePath, label) {
  try {
    const rawText = (await fs.readFile(filePath, "utf8")).replace(/^\uFEFF/, "");

    let parsed;

    try {
      parsed = JSON.parse(rawText);
    } catch (jsonError) {
      throw new Error(label + " is not valid JSON: " + jsonError.message);
    }

    if (!Array.isArray(parsed)) {
      throw new Error(label + " must be a JSON array.");
    }

    return parsed;
  } catch (error) {
    throw new Error("Failed to read " + label + ": " + error.message);
  }
}

function validateTopic(topic, index) {
  try {
    for (const field of REQUIRED_TOPIC_FIELDS) {
      if (!(field in topic)) {
        throw new Error("Topic at index " + index + " is missing required field: " + field);
      }
    }

    if (typeof topic.id !== "string" || topic.id.trim() === "") {
      throw new Error("Topic at index " + index + " must have a non-empty string id.");
    }

    if (typeof topic.title !== "string" || topic.title.trim() === "") {
      throw new Error("Topic at index " + index + " must have a non-empty string title.");
    }

    if (typeof topic.status !== "string" || topic.status.trim() === "") {
      throw new Error("Topic at index " + index + " must have a non-empty string status.");
    }

    if (!Number.isInteger(topic.priority)) {
      throw new Error("Topic at index " + index + " priority must be an integer.");
    }

    if (typeof topic.video_type !== "string" || topic.video_type.trim() === "") {
      throw new Error("Topic at index " + index + " must have a non-empty string video_type.");
    }

    if (typeof topic.risk_level !== "string" || topic.risk_level.trim() === "") {
      throw new Error("Topic at index " + index + " must have a non-empty string risk_level.");
    }

    if (!Array.isArray(topic.source_notes)) {
      throw new Error("Topic at index " + index + " source_notes must be an array.");
    }

    if (typeof topic.created_at !== "string" || topic.created_at.trim() === "") {
      throw new Error("Topic at index " + index + " must have a non-empty string created_at.");
    }
  } catch (error) {
    throw new Error("Topic validation failed: " + error.message);
  }
}

async function main() {
  try {
    logInfo("Validating Ember & Stone state files...");

    const topics = await readJsonArray(TOPIC_QUEUE_PATH, "topic-queue.json");
    const published = await readJsonArray(PUBLISHED_PATH, "published.json");

    topics.forEach((topic, index) => {
      validateTopic(topic, index);
    });

    logInfo("topic-queue.json valid. Topic count: " + topics.length);
    logInfo("published.json valid. Published count: " + published.length);
    logInfo("State validation passed.");
  } catch (error) {
    logError(error.message);
    process.exitCode = 1;
  }
}

await main();
