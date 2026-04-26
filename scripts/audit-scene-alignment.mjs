// scripts/audit-scene-alignment.mjs
// Purpose: Block visuals if scene prompts drift away from narration.
// Why: Visuals must support the spoken story, not invent disconnected content.

import path from "node:path";
import { readJson, writeJson, logInfo, logError } from "./lib/json-utils.mjs";

const ROOT_DIR = process.cwd();
const SELECTED_TOPICS_PATH = path.join(ROOT_DIR, "output", "state", "selected-topics.json");
const SCRIPT_ROOT = path.join(ROOT_DIR, "output", "scripts");
const AUDIT_ROOT = path.join(ROOT_DIR, "output", "scene-alignment");

function textIncludesAny(text, terms) {
  const lower = String(text || "").toLowerCase();
  return terms.some((term) => lower.includes(term.toLowerCase()));
}

function auditKnownRisk(topic, draft) {
  const failures = [];
  const narration = draft.narration_script || "";
  const scenes = Array.isArray(draft.scenes) ? draft.scenes : [];

  for (const scene of scenes) {
    const sceneText = [
      scene.scene_title,
      scene.narration_summary,
      scene.visual_prompt
    ].join(" ");

    if (
      textIncludesAny(sceneText, ["Descent Progression"]) &&
      !textIncludesAny(narration, ["Descent Progression"])
    ) {
      failures.push("Scene " + scene.scene_number + " references Descent Progression but narration does not.");
    }
  }

  return failures;
}

function auditDisclaimer(topic, draft) {
  const failures = [];
  const tags = Array.isArray(draft.youtube_tags) ? draft.youtube_tags.join(" ") : "";
  const description = draft.youtube_description || "";

  const usesDndSearchTerms = textIncludesAny(tags, ["dnd", "dungeon master", "ttrpg"]);
  const hasDisclaimer = textIncludesAny(description, [
    "not affiliated",
    "wizards of the coast",
    "original fiction"
  ]);

  if (usesDndSearchTerms && !hasDisclaimer) {
    failures.push("D&D/TTRPG search tags detected but YouTube description disclaimer is missing.");
  }

  return failures;
}

function auditWordPolicy(topic, draft) {
  const failures = [];
  const tightening = draft.tightening || {};

  if (tightening.production_target_words !== 1200) {
    failures.push("Missing production_target_words metadata set to 1200.");
  }

  if (!tightening.policy_note) {
    failures.push("Missing tightening policy note explaining target vs acceptable range.");
  }

  return failures;
}

async function auditTopic(topic) {
  const draftPath = path.join(SCRIPT_ROOT, topic.id, "script-draft-tightened.json");
  const auditPath = path.join(AUDIT_ROOT, topic.id, "scene-alignment-audit.json");
  const draft = await readJson(draftPath, "tightened script for " + topic.id);

  const failures = [
    ...auditKnownRisk(topic, draft),
    ...auditDisclaimer(topic, draft),
    ...auditWordPolicy(topic, draft)
  ];

  const audit = {
    topic_id: topic.id,
    topic_title: topic.title,
    pass: failures.length === 0,
    failures,
    audited_at: new Date().toISOString()
  };

  await writeJson(auditPath, audit);
  logInfo(topic.title + " scene alignment pass: " + audit.pass);

  if (!audit.pass) {
    failures.forEach((failure) => logError(failure));
  }

  return audit;
}

async function main() {
  try {
    logInfo("Auditing scene alignment...");

    const selectedState = await readJson(SELECTED_TOPICS_PATH, "selected-topics.json");
    const selectedTopics = Array.isArray(selectedState.topics) ? selectedState.topics : [];

    if (selectedTopics.length === 0) {
      throw new Error("No selected topics found.");
    }

    const results = [];

    for (const topic of selectedTopics) {
      results.push(await auditTopic(topic));
    }

    const passCount = results.filter((item) => item.pass === true).length;
    logInfo("Scene alignment pass count: " + passCount + " of " + results.length);

    if (passCount !== results.length) {
      throw new Error("Scene alignment audit failed.");
    }
  } catch (error) {
    logError(error.message);
    process.exitCode = 1;
  }
}

await main();
