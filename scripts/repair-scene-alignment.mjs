// scripts/repair-scene-alignment.mjs
// Purpose: Repair known scene/narration alignment issues without changing narration.
// Why: Existing paid voice audio must stay valid unless narration is intentionally remade.

import path from "node:path";
import { readJson, writeJson, logInfo, logError } from "./lib/json-utils.mjs";

const ROOT_DIR = process.cwd();
const SCRIPT_ROOT = path.join(ROOT_DIR, "output", "scripts");

function updateTighteningPolicy(draft) {
  const tightening = draft.tightening || {};

  return {
    ...draft,
    tightening: {
      ...tightening,
      editorial_target_words: tightening.target_words || 950,
      production_target_words: 1200,
      preferred_max_words: tightening.preferred_max_words || 1200,
      acceptable_max_words: tightening.acceptable_max_words || 1350,
      policy_note: "Accepted if narration is production-tight and at or below acceptable_max_words. Editorial target is a goal, not a hard failure."
    }
  };
}

function repairForgottenGod(draft) {
  const scenes = Array.isArray(draft.scenes) ? draft.scenes : [];

  const repairedScenes = scenes.map((scene) => {
    if (Number(scene.scene_number) !== 6) {
      return scene;
    }

    return {
      ...scene,
      scene_title: "The Children Draw the Sign",
      narration_summary: "Children in nearby villages begin drawing the same forbidden symbol without being taught it, proving the buried god is still reaching beyond the mountain.",
      visual_prompt: "Dark fantasy cinematic scene, village children sitting on a cold floor drawing the same strange black spiral symbol on slate and parchment, worried adults watching from a doorway, candlelight, mountain shadow through the window, ominous atmosphere, no text, no letters, no logos."
    };
  });

  return {
    ...draft,
    scenes: repairedScenes,
    scene_alignment_note: {
      repaired_at: new Date().toISOString(),
      reason: "Scene 6 previously referenced Descent Progression content not present in narration. Repaired scene metadata to match existing narration and preserve generated voice audio."
    }
  };
}

async function main() {
  try {
    logInfo("Repairing scene alignment issues...");

    const topicId = "forgotten-god-under-mountain";
    const draftPath = path.join(SCRIPT_ROOT, topicId, "script-draft-tightened.json");

    let draft = await readJson(draftPath, "tightened script for " + topicId);
    draft = repairForgottenGod(updateTighteningPolicy(draft));

    await writeJson(draftPath, draft);

    const cityPath = path.join(SCRIPT_ROOT, "city-that-erased-its-own-name", "script-draft-tightened.json");

    try {
      const cityDraft = await readJson(cityPath, "tightened script for city-that-erased-its-own-name");
      await writeJson(cityPath, updateTighteningPolicy(cityDraft));
      logInfo("Updated city tightening policy metadata.");
    } catch {
      logInfo("City tightened draft not available to update.");
    }

    logInfo("Scene alignment repair complete.");
  } catch (error) {
    logError(error.message);
    process.exitCode = 1;
  }
}

await main();
