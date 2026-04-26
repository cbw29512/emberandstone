// scripts/lib/script-tightening-core.mjs
// Purpose: Tighten one script draft while keeping the JSON structure controlled by code.
// Why: Models should write prose; code should own JSON and state.

import path from "node:path";
import { readJson, writeJson, logInfo } from "./json-utils.mjs";
import { callAnthropicMessage } from "./anthropic-client.mjs";
import { cleanNarration, countWords, sentenceTrim } from "./narration-utils.mjs";

const TARGET_WORDS = 1200;
const PREFERRED_MAX_WORDS = 1500;
const ACCEPTABLE_MAX_WORDS = 1800;
const MAX_ATTEMPTS = 3;

function buildPrompt(projectContext, topic, currentNarration, attemptNumber) {
  return [
    "PROJECT CONTEXT:",
    projectContext,
    "",
    "TASK:",
    "Rewrite the narration into a tight cinematic dark fantasy YouTube narration.",
    "",
    "TOPIC:",
    topic.title,
    "",
    "ATTEMPT:",
    String(attemptNumber),
    "",
    "RULES:",
    "- Return only narration text.",
    "- Do not return JSON.",
    "- Do not use markdown.",
    "- Do not include labels.",
    "- Aim for a natural story length around " + TARGET_WORDS + " words, but do not damage story quality to hit a number.",
    "- Prefer under " + PREFERRED_MAX_WORDS + " words, but quality, focus, and completeness matter more than exact length.",
    "- Cut filler, repeated warnings, repeated lore, and slow setup.",
    "- Keep the hook strong in the first 10 seconds.",
    "- Keep it original fantasy lore, not official D&D lore.",
    "",
    "CURRENT NARRATION:",
    currentNarration
  ].join("\n");
}

async function requestTightening(topic, narration, runtimeConfig, projectContext, attemptNumber) {
  try {
    const response = await callAnthropicMessage(runtimeConfig, {
      system: "You are a ruthless YouTube script editor. Return only narration text.",
      prompt: buildPrompt(projectContext, topic, narration, attemptNumber),
      maxTokens: 2800
    });

    return cleanNarration(response.text);
  } catch (error) {
    throw new Error("Tightening request failed for " + topic.id + ": " + error.message);
  }
}

export async function tightenOneScript(topic, options) {
  try {
    const scriptRoot = options.scriptRoot;
    const runtimeConfig = options.runtimeConfig;
    const projectContext = options.projectContext;

    const draftPath = path.join(scriptRoot, topic.id, "script-draft.json");
    const tightenedPath = path.join(scriptRoot, topic.id, "script-draft-tightened.json");

    const draft = await readJson(draftPath, "script-draft.json for " + topic.id);
    const originalWords = countWords(draft.narration_script);

    logInfo(topic.title + " original words: " + originalWords);

    let bestNarration = draft.narration_script;
    let bestWords = originalWords;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      logInfo(topic.title + " tightening attempt " + attempt + " of " + MAX_ATTEMPTS);

      const candidate = await requestTightening(
        topic,
        bestNarration,
        runtimeConfig,
        projectContext,
        attempt
      );

      const candidateWords = countWords(candidate);
      logInfo(topic.title + " attempt " + attempt + " words: " + candidateWords);

      if (candidateWords > 0 && candidateWords < bestWords) {
        bestNarration = candidate;
        bestWords = candidateWords;
      }

      if (bestWords <= PREFERRED_MAX_WORDS) {
        break;
      }
    }

    let method = "ai_tightened";

    if (bestWords > ACCEPTABLE_MAX_WORDS) {
      bestNarration = sentenceTrim(bestNarration, PREFERRED_MAX_WORDS);
      bestWords = countWords(bestNarration);
      method = "ai_tightened_then_sentence_trimmed";
    }

    if (bestWords > ACCEPTABLE_MAX_WORDS || bestWords < 600) {
      throw new Error("Tightened narration outside safe range: " + bestWords + " words.");
    }

    await writeJson(tightenedPath, {
      ...draft,
      narration_script: bestNarration,
      tightening: {
        method,
        source: "script-draft.json",
        original_word_count: originalWords,
        tightened_word_count: bestWords,
        target_words: TARGET_WORDS,
        preferred_max_words: PREFERRED_MAX_WORDS,
        acceptable_max_words: ACCEPTABLE_MAX_WORDS,
        created_at: new Date().toISOString()
      }
    });

    logInfo(topic.title + " final tightened words: " + bestWords);
  } catch (error) {
    throw new Error("Could not tighten " + topic.id + ": " + error.message);
  }
}
