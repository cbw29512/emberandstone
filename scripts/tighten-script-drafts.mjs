// scripts/tighten-script-drafts.mjs
// Purpose: Run script tightening for selected topics.
// Why: This file stays small; implementation lives in scripts/lib.

import path from "node:path";
import { readJson, logInfo, logError } from "./lib/json-utils.mjs";
import { loadRuntimeConfig } from "./lib/api-keys.mjs";
import { readProjectContext } from "./lib/project-context.mjs";
import { tightenOneScript } from "./lib/script-tightening-core.mjs";

const ROOT_DIR = process.cwd();
const SELECTED_TOPICS_PATH = path.join(ROOT_DIR, "output", "state", "selected-topics.json");
const SCRIPT_ROOT = path.join(ROOT_DIR, "output", "scripts");

async function main() {
  try {
    logInfo("Tightening selected script drafts...");

    const selectedState = await readJson(SELECTED_TOPICS_PATH, "selected-topics.json");
    const selectedTopics = Array.isArray(selectedState.topics) ? selectedState.topics : [];

    if (selectedTopics.length === 0) {
      throw new Error("No selected topics found. Run npm run select:topics first.");
    }

    const runtimeConfig = loadRuntimeConfig(ROOT_DIR, {
      requireAnthropicKey: true
    });

    const projectContext = await readProjectContext(ROOT_DIR);

    for (const topic of selectedTopics) {
      await tightenOneScript(topic, {
        scriptRoot: SCRIPT_ROOT,
        runtimeConfig,
        projectContext
      });
    }

    logInfo("Script tightening complete.");
  } catch (error) {
    logError(error.message);
    process.exitCode = 1;
  }
}

await main();
