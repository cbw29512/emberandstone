// scripts/select-topics.mjs
// Purpose: Select the next topic or topics to prepare for video generation.
// Why: The pipeline needs deterministic launch logic: 2 videos at launch,
// then 1 video per day after that.
// Generated selection state is written to output/state so Git stays clean.

import fs from "node:fs/promises";
import path from "node:path";

const ROOT_DIR = process.cwd();

const TOPIC_QUEUE_PATH = path.join(ROOT_DIR, "content", "topic-queue.json");
const PUBLISHED_PATH = path.join(ROOT_DIR, "content", "published.json");
const CHANNEL_CONFIG_PATH = path.join(ROOT_DIR, "content", "channel-config.json");
const SELECTED_TOPICS_PATH = path.join(ROOT_DIR, "output", "state", "selected-topics.json");

function logInfo(message) {
  console.log("[INFO] " + message);
}

function logError(message) {
  console.error("[ERROR] " + message);
}

async function readJson(filePath, label) {
  try {
    const rawText = (await fs.readFile(filePath, "utf8")).replace(/^\uFEFF/, "");

    try {
      return JSON.parse(rawText);
    } catch (jsonError) {
      throw new Error(label + " is not valid JSON: " + jsonError.message);
    }
  } catch (error) {
    throw new Error("Failed to read " + label + ": " + error.message);
  }
}

async function writeJson(filePath, data) {
  try {
    const prettyJson = JSON.stringify(data, null, 2) + "\n";

    // Ensure output/state exists before writing selected-topics.json.
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    await fs.writeFile(filePath, prettyJson, "utf8");
  } catch (error) {
    throw new Error("Failed to write selected topics: " + error.message);
  }
}

function getPublishedCount(publishedItems) {
  try {
    if (!Array.isArray(publishedItems)) {
      throw new Error("published.json must be an array.");
    }

    return publishedItems.filter((item) => {
      return item && ["uploaded", "published"].includes(item.status);
    }).length;
  } catch (error) {
    throw new Error("Could not calculate published count: " + error.message);
  }
}

function getCompletedTopicIds(publishedItems) {
  const completedStatuses = new Set(["uploaded", "published"]);

  if (!Array.isArray(publishedItems)) {
    return new Set();
  }

  return new Set(
    publishedItems
      .filter((item) => item && completedStatuses.has(item.status))
      .map((item) => item.id || item.topic_id)
      .filter(Boolean)
  );
}

function filterCompletedTopics(topics, completedIds) {
  if (!Array.isArray(topics)) {
    return [];
  }

  return topics.filter((topic) => {
    return topic && topic.id && !completedIds.has(topic.id);
  });
}
function getRequestedCount(channelConfig, publishedCount) {
  try {
    const publishing = channelConfig.publishing || {};

    const initialLaunchCount = Number(publishing.initial_launch_video_count);
    const dailyPublishCount = Number(publishing.daily_publish_count);

    if (!Number.isInteger(initialLaunchCount) || initialLaunchCount < 1) {
      throw new Error("initial_launch_video_count must be a positive integer.");
    }

    if (!Number.isInteger(dailyPublishCount) || dailyPublishCount < 1) {
      throw new Error("daily_publish_count must be a positive integer.");
    }

    if (publishedCount < initialLaunchCount) {
      return {
        count: initialLaunchCount - publishedCount,
        reason: publishedCount === 0 ? "launch_batch" : "finish_launch_batch"
      };
    }

    return {
      count: dailyPublishCount,
      reason: "daily_batch"
    };
  } catch (error) {
    throw new Error("Could not determine requested topic count: " + error.message);
  }
}

function selectQueuedTopics(topics, requestedCount) {
  try {
    if (!Array.isArray(topics)) {
      throw new Error("topic-queue.json must be an array.");
    }

    const queuedTopics = topics
      .filter((topic) => topic.status === "queued")
      .sort((a, b) => a.priority - b.priority);

    return queuedTopics.slice(0, requestedCount);
  } catch (error) {
    throw new Error("Could not select queued topics: " + error.message);
  }
}

async function main() {
  try {
    logInfo("Selecting next Ember & Stone topics...");

    const topics = await readJson(TOPIC_QUEUE_PATH, "topic-queue.json");
    const published = await readJson(PUBLISHED_PATH, "published.json");
    const channelConfig = await readJson(CHANNEL_CONFIG_PATH, "channel-config.json");

    const publishedCount = getPublishedCount(published);
    const request = getRequestedCount(channelConfig, publishedCount);
        const completedIds = getCompletedTopicIds(published);
    const availableTopics = filterCompletedTopics(topics, completedIds);
    const selectedTopics = selectQueuedTopics(availableTopics, request.count);

    const selectedState = {
      selected_at: new Date().toISOString(),
      selection_reason: request.reason,
      requested_count: request.count,
      topics: selectedTopics
    };

    await writeJson(SELECTED_TOPICS_PATH, selectedState);

    logInfo("Published count: " + publishedCount);
    logInfo("Selection reason: " + request.reason);
    logInfo("Requested topic count: " + request.count);
    logInfo("Selected topic count: " + selectedTopics.length);

    selectedTopics.forEach((topic, index) => {
      logInfo("Selected " + (index + 1) + ": " + topic.title);
    });

    if (selectedTopics.length < request.count) {
      logError("Not enough queued topics available.");
      process.exitCode = 1;
    }
  } catch (error) {
    logError(error.message);
    process.exitCode = 1;
  }
}

await main();
