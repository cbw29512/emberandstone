// scripts/repair-image-prompt-text-risks.mjs
// Purpose: Remove readable-text risks from image prompts.
// Why: Image models often create bad fake letters when prompted with visible words.

import path from "node:path";
import { readJson, writeJson, logInfo, logError } from "./lib/json-utils.mjs";

const ROOT_DIR = process.cwd();
const VISUAL_ROOT = path.join(ROOT_DIR, "output", "visuals");

const REPAIRS = {
  "city-that-erased-its-own-name": {
    5: {
      image_prompt:
        "An abstract conceptual dark fantasy scene: an ancient contract parchment covered in fading ink lines, seal marks, and ritual smears dissolving into blank parchment, no readable letters or words. Above it, a pale city skyline is reflected in dark water, solid and real but wavering. The reflection is sharper than the reality above it. Surreal composition, ink-black water, pale city silhouette, single cold light source from above, no text, no letters, no logos."
    },
    6: {
      image_prompt:
        "A scholar slumped peacefully in a wooden chair at a writing desk, eyes open and empty, a quill still loosely in their hand. Open journals on the desk are completely blank. A single candle burns low. On the scholar's exposed wrist is a precise carved geometric mark, clearly intentional but not readable text. The room is otherwise undisturbed. Low candlelight, heavy shadow, extreme close-up detail, dark fantasy aesthetic, no text, no letters, no logos."
    }
  },
  "forgotten-god-under-mountain": {
    4: {
      image_prompt:
        "A candlelit study interior, shelves of leather-bound volumes, a large desk covered in blank maps and academic papers with no readable writing. In the foreground, a formal geological paper shows only illegible marks and diagram-like shapes. Partially hidden beneath it, a smaller worn field journal lies open with frantic illegible charcoal strokes and one heavily underlined black smear, but no readable words. No person present. Dark fantasy still-life illustration, close detail, warm candlelight against cold shadow, no text, no letters, no logos."
    },
    6: {
      image_prompt:
        "Wide dark fantasy cinematic scene inside a low village room: several children sit scattered across a cold stone floor drawing the same strange black spiral-like symbol on slate and rough parchment. Worried adults watch silently from the doorway. Candlelight flickers across the room. Through a small window, the mountain's shadow looms in the distance. Ominous atmosphere, no readable writing, no text, no letters, no logos."
    },
    7: {
      image_prompt:
        "Extreme close-up of a child's hand drawing a complex angular charcoal symbol on a rough wooden floor. The symbol is geometric, deliberate, and unsettling, like a shape copied from a dream rather than a language. Around the hand are several other rough papers with the same symbol drawn in different sizes, but no readable words. Through a low window in the blurred background, the blunt silhouette of the nameless mountain is visible against a pale pre-dawn sky. Quiet horror, no gore, no text, no letters, no logos."
    }
  }
};

function repairScenes(packageData) {
  const topicRepairs = REPAIRS[packageData.topic_id] || {};

  packageData.scenes = packageData.scenes.map((scene) => {
    const repair = topicRepairs[Number(scene.scene_number)];

    if (!repair) {
      return scene;
    }

    return {
      ...scene,
      ...repair,
      repair_note: "Readable text risk removed before image generation."
    };
  });

  packageData.thumbnail_prompt = String(packageData.thumbnail_prompt || "")
    .replace(/visible text/gi, "no readable text")
    .replace(/letters/gi, "no letters");

  packageData.visual_text_risk_repaired_at = new Date().toISOString();
  return packageData;
}

async function main() {
  try {
    logInfo("Repairing image prompt text risks...");

    for (const topicId of Object.keys(REPAIRS)) {
      const packagePath = path.join(VISUAL_ROOT, topicId, "image-prompt-package.json");
      const packageData = await readJson(packagePath, "image prompt package for " + topicId);
      await writeJson(packagePath, repairScenes(packageData));
      logInfo("Repaired image prompt text risks for: " + topicId);
    }

    logInfo("Image prompt text-risk repair complete.");
  } catch (error) {
    logError(error.message);
    process.exitCode = 1;
  }
}

await main();
