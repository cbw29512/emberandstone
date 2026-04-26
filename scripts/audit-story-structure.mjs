// scripts/audit-story-structure.mjs
// Purpose: Run story structure audits for selected topics.
// Why: Ember & Stone must not move to visuals unless the lore is focused and complete.

import path from "node:path";
import { loadRuntimeConfig } from "./lib/api-keys.mjs";
import { readJson, logInfo, logError } from "./lib/json-utils.mjs";
import { readProjectContext } from "./lib/project-context.mjs";
import { auditOneStory } from "./lib/story-audit-core.mjs";

const ROOT_DIR = process.cwd();
const SELECTED_TOPICS_PATH = path.join(ROOT_DIR, "output", "state", "selected-topics.json");
const SCRIPT_ROOT = path.join(ROOT_DIR, "output", "scripts");
const AUDIT_ROOT = path.join(ROOT_DIR, "output", "story-audit");

async function main() {
  try {
    logInfo("Auditing story structure...");

    const runtimeConfig = loadRuntimeConfig(ROOT_DIR, { requireAnthropicKey: true });
    const projectContext = await readProjectContext(ROOT_DIR);
    const selectedState = await readJson(SELECTED_TOPICS_PATH, "selected-topics.json");
    const selectedTopics = Array.isArray(selectedState.topics) ? selectedState.topics : [];

    if (selectedTopics.length === 0) {
      throw new Error("No selected topics found.");
    }

    const results = [];

    for (const topic of selectedTopics) {
      results.push(await auditOneStory(topic, {
        runtimeConfig,
        projectContext,
        scriptRoot: SCRIPT_ROOT,
        auditRoot: AUDIT_ROOT
      }));
    }

    const passCount = results.filter((audit) => audit.pass === true).length;
    logInfo("Story audit pass count: " + passCount + " of " + results.length);
    logInfo("Story audit complete.");
  } catch (error) {
    logError(error.message);
    process.exitCode = 1;
  }
}

await main();
