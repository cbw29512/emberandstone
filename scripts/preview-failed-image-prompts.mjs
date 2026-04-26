// scripts/preview-failed-image-prompts.mjs
// Purpose: Print compiled prompts for the current hard failed scenes.
// Why: We inspect prompt strength before spending more Leonardo credits.

import path from "node:path";
import { readJson, logInfo, logError } from "./lib/json-utils.mjs";
import { compileBeatLockedPrompt } from "./lib/image-prompt-compiler.mjs";

const ROOT_DIR = process.cwd();
const VISUAL_ROOT = path.join(ROOT_DIR, "output", "visuals");

const EXTRA_STYLE = [
  "dark fantasy illustration",
  "cinematic composition",
  "strong focal point",
  "moody fog",
  "atmospheric depth",
  "high detail",
  "dramatic light",
  "no readable text",
  "no letters",
  "no logos"
].join(", ");

const TARGETS = [
  { topicId: "city-that-erased-its-own-name", sceneNumber: 6 },
  { topicId: "forgotten-god-under-mountain", sceneNumber: 3 },
  { topicId: "forgotten-god-under-mountain", sceneNumber: 6 },
  { topicId: "forgotten-god-under-mountain", sceneNumber: 7 }
];

async function loadScene(topicId, sceneNumber) {
  const packagePath = path.join(VISUAL_ROOT, topicId, "image-prompt-package.json");
  const promptPackage = await readJson(packagePath, "image prompt package for " + topicId);
  const scene = promptPackage.scenes.find((item) => Number(item.scene_number) === Number(sceneNumber));

  if (!scene) {
    throw new Error("Missing scene " + sceneNumber + " for " + topicId);
  }

  return scene;
}

async function main() {
  try {
    logInfo("Previewing compiled failed-scene prompts...");

    for (const target of TARGETS) {
      const scene = await loadScene(target.topicId, target.sceneNumber);

      console.log("");
      console.log("============================================================");
      console.log(target.topicId + " / scene-" + target.sceneNumber);
      console.log(scene.scene_title);
      console.log("============================================================");
      console.log(compileBeatLockedPrompt(scene.beat_lock, EXTRA_STYLE));
    }
  } catch (error) {
    logError(error.message);
    process.exitCode = 1;
  }
}

await main();
