// scripts/lib/story-audit-core.mjs
// Purpose: Audit one script for story structure and IP safety.
// Why: Production-grade video generation must stop before visuals if story quality fails.

import fs from "node:fs/promises";
import path from "node:path";
import { callAnthropicMessage } from "./anthropic-client.mjs";
import { readJson, writeJson, logInfo, logError } from "./json-utils.mjs";
import { buildStoryAuditPrompt } from "./story-audit-prompt.mjs";

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function extractJson(text, topicId) {
  try {
    const trimmed = String(text || "").trim();
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
      throw new Error("No JSON object found.");
    }

    return JSON.parse(trimmed.slice(start, end + 1));
  } catch (error) {
    throw new Error("Could not parse story audit for " + topicId + ": " + error.message);
  }
}

function normalizeAudit(topic, audit) {
  const scores = audit.scores || {};
  const requiredScores = [
    scores.beginning,
    scores.middle,
    scores.summary,
    scores.ending,
    scores.focus,
    scores.completeness,
    scores.ip_safety
  ];

  const scoresPass = requiredScores.every((score) => Number(score) >= 8);
  const structurePass = Boolean(
    audit.beginning?.present &&
    audit.middle?.present &&
    audit.summary?.present &&
    audit.ending?.present &&
    audit.focus?.single_topic &&
    audit.focus?.no_drift &&
    audit.ip_safety?.safe_original_lore
  );

  return {
    ...audit,
    topic_id: topic.id,
    pass: Boolean(scoresPass && structurePass && audit.pass === true),
    audited_at: new Date().toISOString()
  };
}

function buildFailedAudit(topic, error) {
  return {
    topic_id: topic.id,
    pass: false,
    technical_failure: true,
    scores: {
      beginning: 0,
      middle: 0,
      summary: 0,
      ending: 0,
      focus: 0,
      completeness: 0,
      ip_safety: 0
    },
    required_fixes: ["Story audit failed technically: " + error.message],
    audited_at: new Date().toISOString()
  };
}

export async function auditOneStory(topic, options) {
  const tightenedPath = path.join(options.scriptRoot, topic.id, "script-draft-tightened.json");
  const fallbackPath = path.join(options.scriptRoot, topic.id, "script-draft.json");
  const draftPath = await fileExists(tightenedPath) ? tightenedPath : fallbackPath;
  const auditPath = path.join(options.auditRoot, topic.id, "story-audit.json");

  try {
    const draft = await readJson(draftPath, "script draft for " + topic.id);

    const response = await callAnthropicMessage(options.runtimeConfig, {
      system: "You are a strict story editor and IP-safety auditor. Return strict JSON only.",
      prompt: buildStoryAuditPrompt(options.projectContext, topic, draft),
      maxTokens: 3000
    });

    const audit = normalizeAudit(topic, extractJson(response.text, topic.id));
    await writeJson(auditPath, audit);

    logInfo(topic.title + " story audit pass: " + audit.pass);
    return audit;
  } catch (error) {
    const failedAudit = buildFailedAudit(topic, error);
    await writeJson(auditPath, failedAudit);
    logError(topic.title + " story audit failed technically: " + error.message);
    return failedAudit;
  }
}
