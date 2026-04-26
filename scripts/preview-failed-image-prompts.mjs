// scripts/preview-failed-image-prompts.mjs
// Purpose: Print compiled prompts for the current hard failed scenes.
// Why: We inspect channel style + scene beat prompts before spending Leonardo credits.

import path from "node:path";
import { readJson, logInfo, logError } from "./lib/json-utils.mjs";
import { compileBeatLockedPrompt } from "./lib/image-prompt-compiler.mjs";
import { readChannelStyle, buildChannelStylePrompt } from "./lib/channel-style.mjs";

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
    logInfo("Previewing channel-styled failed-scene prompts...");

    const channelStyle = await readChannelStyle(ROOT_DIR);
    const channelStylePrompt = buildChannelStylePrompt(channelStyle);

    for (const target of TARGETS) {
      const scene = await loadScene(target.topicId, target.sceneNumber);
      const scenePrompt = compileBeatLockedPrompt(scene.beat_lock, EXTRA_STYLE);
      const fullPrompt = [channelStylePrompt, scenePrompt].join(" ");

      console.log("");
      console.log("============================================================");
      console.log(target.topicId + " / scene-" + target.sceneNumber);
      console.log(scene.scene_title);
      console.log("============================================================");
      console.log(fullPrompt);
    }
  } catch (error) {
    logError(error.message);
    process.exitCode = 1;
  }
}

await main();
