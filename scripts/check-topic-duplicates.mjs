// scripts/check-topic-duplicates.mjs
// Purpose: Prevent repeated topics before generation.
// Why: Ember & Stone must be one topic, one video, done forever.

import fs from "node:fs/promises";
import path from "node:path";

const ROOT_DIR = process.cwd();
const TOPIC_QUEUE_PATH = path.join(ROOT_DIR, "content", "topic-queue.json");
const PUBLISHED_PATH = path.join(ROOT_DIR, "content", "published.json");
const SELECTED_TOPICS_PATH = path.join(ROOT_DIR, "output", "state", "selected-topics.json");

function logInfo(message) {
  console.log("[INFO] " + message);
}

function logError(message) {
  console.error("[ERROR] " + message);
}

async function readJson(filePath, label, fallback = null) {
  try {
    const rawText = (await fs.readFile(filePath, "utf8")).replace(/^\uFEFF/, "");
    return JSON.parse(rawText);
  } catch (error) {
    if (fallback !== null) {
      return fallback;
    }

    throw new Error("Failed to read " + label + ": " + error.message);
  }
}

function normalizeTitle(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getCompletedTopicIds(publishedItems) {
  const completedStatuses = new Set(["uploaded", "published"]);

  return new Set(
    publishedItems
      .filter((item) => item && completedStatuses.has(item.status))
      .map((item) => item.topic_id)
      .filter(Boolean)
  );
}

function assertNoDuplicateQueueTopics(topics) {
  const seenIds = new Map();
  const seenTitles = new Map();

  for (const topic of topics) {
    if (!topic || !topic.id || !topic.title) {
      throw new Error("Every topic must have id and title.");
    }

    if (seenIds.has(topic.id)) {
      throw new Error("Duplicate topic id found: " + topic.id);
    }

    seenIds.set(topic.id, topic.title);

    const normalizedTitle = normalizeTitle(topic.title);

    if (seenTitles.has(normalizedTitle)) {
      throw new Error(
        "Duplicate topic title found: " +
        topic.title +
        " conflicts with " +
        seenTitles.get(normalizedTitle)
      );
    }

    seenTitles.set(normalizedTitle, topic.title);
  }
}

function assertSelectedTopicsAreNotCompleted(selectedTopics, completedIds) {
  for (const topic of selectedTopics) {
    if (completedIds.has(topic.id)) {
      throw new Error("Selected topic already completed: " + topic.id);
    }
  }
}

async function main() {
  try {
    logInfo("Checking Ember & Stone topic duplicates...");

    const topics = await readJson(TOPIC_QUEUE_PATH, "topic-queue.json");
    const published = await readJson(PUBLISHED_PATH, "published.json");
    const selectedState = await readJson(SELECTED_TOPICS_PATH, "selected-topics.json", {
      topics: []
    });

    if (!Array.isArray(topics)) {
      throw new Error("topic-queue.json must be an array.");
    }

    if (!Array.isArray(published)) {
      throw new Error("published.json must be an array.");
    }

    const selectedTopics = Array.isArray(selectedState.topics) ? selectedState.topics : [];
    const completedIds = getCompletedTopicIds(published);

    assertNoDuplicateQueueTopics(topics);
    assertSelectedTopicsAreNotCompleted(selectedTopics, completedIds);

    logInfo("Topic queue count: " + topics.length);
    logInfo("Completed topic count: " + completedIds.size);
    logInfo("Selected topic count: " + selectedTopics.length);
    logInfo("Duplicate/topic reuse check passed.");
  } catch (error) {
    logError(error.message);
    process.exitCode = 1;
  }
}

await main();
