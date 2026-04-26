// scripts/audit-production-readiness.mjs
// Purpose: Decide whether selected topics are ready for visual/video production.
// Why: The channel must not publish weak, incomplete, repeated, or unsafe content.

import path from "node:path";
import { readJson, writeJson, logInfo, logError } from "./lib/json-utils.mjs";
import { fileSizeBytes } from "./lib/audio-file-utils.mjs";

const ROOT_DIR = process.cwd();
const SELECTED_TOPICS_PATH = path.join(ROOT_DIR, "output", "state", "selected-topics.json");
const STORY_AUDIT_ROOT = path.join(ROOT_DIR, "output", "story-audit");
const AUDIO_ROOT = path.join(ROOT_DIR, "output", "audio");
const PRODUCTION_ROOT = path.join(ROOT_DIR, "output", "production");

async function tryReadJson(filePath, fallback) {
  try {
    return await readJson(filePath, filePath);
  } catch {
    return fallback;
  }
}

function storyPassed(storyAudit) {
  return Boolean(
    storyAudit &&
    storyAudit.pass === true &&
    storyAudit.beginning?.present === true &&
    storyAudit.middle?.present === true &&
    storyAudit.summary?.present === true &&
    storyAudit.ending?.present === true &&
    storyAudit.focus?.single_topic === true &&
    storyAudit.focus?.no_drift === true &&
    storyAudit.ip_safety?.safe_original_lore === true
  );
}

async function auditTopic(topic) {
  const storyAuditPath = path.join(STORY_AUDIT_ROOT, topic.id, "story-audit.json");
  const audioManifestPath = path.join(AUDIO_ROOT, topic.id, "audio-manifest.json");
  const audioPath = path.join(AUDIO_ROOT, topic.id, "narration.mp3");
  const productionPath = path.join(PRODUCTION_ROOT, topic.id, "production-manifest.json");

  const storyAudit = await tryReadJson(storyAuditPath, null);
  const audioManifest = await tryReadJson(audioManifestPath, null);
  const audioBytes = await fileSizeBytes(audioPath);

  const checks = {
    story_audit_passed: storyPassed(storyAudit),
    audio_available: audioBytes > 0,
    audio_not_quota_blocked: audioManifest?.audio_status !== "blocked_quota",
    human_review_required: true
  };

  const publishReady = (
    checks.story_audit_passed &&
    checks.audio_available &&
    checks.audio_not_quota_blocked &&
    checks.human_review_required === false
  );

  const manifest = {
    topic_id: topic.id,
    topic_title: topic.title,
    production_status: publishReady ? "publish_ready" : "blocked_review",
    publish_ready: publishReady,
    checks,
    required_next_actions: [],
    updated_at: new Date().toISOString()
  };

  if (!checks.story_audit_passed) {
    manifest.required_next_actions.push("Run or repair story audit before visual/video generation.");
  }

  if (!checks.audio_available) {
    manifest.required_next_actions.push("Generate or remake narration audio.");
  }

  if (!checks.audio_not_quota_blocked) {
    manifest.required_next_actions.push("Wait for more ElevenLabs quota or reduce narration length.");
  }

  if (checks.human_review_required) {
    manifest.required_next_actions.push("Human review must approve story and voice before upload.");
  }

  await writeJson(productionPath, manifest);

  logInfo(topic.title + " production status: " + manifest.production_status);
  return manifest;
}

async function main() {
  try {
    logInfo("Auditing production readiness...");

    const selectedState = await readJson(SELECTED_TOPICS_PATH, "selected-topics.json");
    const selectedTopics = Array.isArray(selectedState.topics) ? selectedState.topics : [];

    if (selectedTopics.length === 0) {
      throw new Error("No selected topics found.");
    }

    const results = [];

    for (const topic of selectedTopics) {
      results.push(await auditTopic(topic));
    }

    const readyCount = results.filter((item) => item.publish_ready === true).length;
    logInfo("Publish-ready count: " + readyCount);
    logInfo("Production audit complete.");
  } catch (error) {
    logError(error.message);
    process.exitCode = 1;
  }
}

await main();
