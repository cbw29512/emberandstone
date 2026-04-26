// scripts/migrate-launch-prompts-to-beat-lock.mjs
// Purpose: Add beat_lock objects to the current launch prompt packages.
// Why: Future image generation must lock to exact story beats, not generic dark fantasy mood.

import path from "node:path";
import { readJson, writeJson, logInfo, logError } from "./lib/json-utils.mjs";

const ROOT_DIR = process.cwd();
const VISUAL_ROOT = path.join(ROOT_DIR, "output", "visuals");

const STYLE = ["dark fantasy", "cinematic", "high detail", "strong focal point"];

const BEAT_LOCKS = {
  "city-that-erased-its-own-name": {
    thumbnail_beat_lock: {
      primary_subject: "a lone cloaked traveler at the edge of a nameless city",
      primary_action: "standing before a foggy city that feels beautiful and deeply wrong",
      required_elements: ["lone traveler", "pale stone city", "misty streets", "no signs", "amber lantern glow"],
      forbidden_drift: ["modern city", "readable signs", "crowded battle", "bright cheerful town", "generic castle only"],
      environment: "wide valley at dusk outside an ancient pale-stone city",
      background_element: "lit aqueducts and empty market squares fading into fog",
      framing: "wide cinematic thumbnail composition with the traveler as the focal point",
      mood: "eerie mystery and impossible memory loss",
      style_tags: STYLE
    },
    scenes: {
      1: {
        primary_subject: "a lone traveler overlooking a nameless pale city",
        primary_action: "discovering the intact city in a fog-filled valley",
        required_elements: ["traveler", "wide valley", "pale stone city", "empty streets", "mist"],
        forbidden_drift: ["modern skyline", "readable signs", "large crowd", "battle scene"],
        environment: "valley overlook at dusk",
        background_element: "aqueducts and market squares with no written names anywhere",
        framing: "wide establishing shot from behind the traveler",
        mood: "beautiful but wrong discovery",
        style_tags: STYLE
      },
      2: {
        primary_subject: "twelve robed figures sealing the Pale Compact",
        primary_action: "standing around a black stone table in a ritual pact",
        required_elements: ["twelve robed figures", "black stone table", "blank open book", "black handprint", "faceless presence in shadow"],
        forbidden_drift: ["empty room", "single figure only", "readable text", "active battle", "church service"],
        environment: "grand underground ritual chamber",
        background_element: "shadowed arch suggesting a faceless entity",
        framing: "medium-wide ritual chamber shot with all figures visible around the table",
        mood: "cold pact, dread, and irreversible bargain",
        style_tags: STYLE
      },
      3: {
        primary_subject: "a confused cartographer at a desk",
        primary_action: "staring at a completely blank map",
        required_elements: ["cartographer", "blank map", "ink-stained hands", "scattered quills", "blank framed maps"],
        forbidden_drift: ["readable map labels", "outdoor landscape", "happy scholar", "modern office"],
        environment: "candlelit stone study",
        background_element: "other blank maps hanging behind the cartographer",
        framing: "medium close shot focused on face and blank map",
        mood: "hollow confusion and creeping supernatural failure",
        style_tags: STYLE
      },
      4: {
        primary_subject: "ordinary residents in the unnamed city market",
        primary_action: "calmly maintaining daily life without names or signs",
        required_elements: ["market stalls", "merchants", "children carrying water", "cart wheel repair", "no written signs"],
        forbidden_drift: ["ruined empty city", "battle", "festival", "modern marketplace", "readable shop signs"],
        environment: "quiet functional street market inside the unnamed city",
        background_element: "blank stall fronts and muted stone buildings",
        framing: "wide street-market scene with mundane activity",
        mood: "normal life made uncanny by absence",
        style_tags: STYLE
      },
      5: {
        primary_subject: "a pale city reflected in black water",
        primary_action: "appearing more real in reflection than reality",
        required_elements: ["blank dissolving parchment", "seal marks", "ink smears", "pale city reflection", "black water"],
        forbidden_drift: ["readable contract text", "bright lake scene", "human portrait", "modern paperwork"],
        environment: "surreal symbolic darkness around an ancient compact",
        background_element: "city skyline reflected sharper than the real skyline",
        framing: "symbolic cinematic composition centered on parchment and reflection",
        mood: "language erasure and supernatural loophole",
        style_tags: STYLE
      },
      6: {
        primary_subject: "a lifeless scholar found at a writing desk",
        primary_action: "slumped motionless after investigating the Compact",
        required_elements: ["slumped scholar", "blank journals", "single candle", "fallen quill", "geometric wrist mark"],
        forbidden_drift: ["actively writing", "standing scholar", "smiling face", "crowded room", "readable text", "gore"],
        environment: "quiet study room after a supernatural death",
        background_element: "blank journals and cold candlelight",
        framing: "medium-wide aftermath shot with scholar clearly motionless",
        mood: "cold aftermath and eerie stillness",
        style_tags: STYLE
      },
      7: {
        primary_subject: "an ageless woman on an ancient bridge",
        primary_action: "standing calmly while the city glows behind her",
        required_elements: ["woman facing away", "stone bridge", "black still water", "amber city lights", "fog"],
        forbidden_drift: ["modern clothes", "action pose", "crowded bridge", "readable signs"],
        environment: "ancient stone bridge at night",
        background_element: "unnamed city glowing through fog",
        framing: "wide approach shot from behind the viewer's perspective",
        mood: "immortality, waiting, and unresolved threat",
        style_tags: STYLE
      }
    }
  },
  "forgotten-god-under-mountain": {
    thumbnail_beat_lock: {
      primary_subject: "a massive nameless mountain looming over shuttered villages",
      primary_action: "dominating the landscape like a buried god pressing upward",
      required_elements: ["massive grey mountain", "low shuttered village", "fog at the base", "blood-red cracked soil", "no people"],
      forbidden_drift: ["snowy alpine postcard", "bright heroic fantasy", "castle fortress", "modern buildings"],
      environment: "Ashfeld Corridor under a pale overcast sky",
      background_element: "village buildings built low with no windows facing the mountain",
      framing: "wide thumbnail composition with the mountain overwhelming the village",
      mood: "ancient pressure, dread, and scale",
      style_tags: STYLE
    },
    scenes: {
      1: {
        primary_subject: "the nameless mountain above ancient low villages",
        primary_action: "looming silently over shuttered homes",
        required_elements: ["grey mountain", "cracked red soil", "low stone-and-thatch buildings", "fog", "no visible people"],
        forbidden_drift: ["snowy mountain", "busy town", "castle", "modern road"],
        environment: "bleak mountain corridor",
        background_element: "village at the mountain base with shuttered buildings",
        framing: "wide establishing shot",
        mood: "ominous silence and ancient weight",
        style_tags: STYLE
      },
      2: {
        primary_subject: "the Hollow Chorus pilgrims approaching the cave",
        primary_action: "ascending toward the dark cave mouth with lanterns",
        required_elements: ["robed pilgrims", "lanterns", "satchels", "fragile parchment", "unnaturally smooth cave entrance"],
        forbidden_drift: ["soldiers", "battle", "modern hikers", "bright sunlight"],
        environment: "rocky mountain path at dusk",
        background_element: "cave entrance swallowing the lantern light",
        framing: "medium-wide procession shot",
        mood: "reverent curiosity before doom",
        style_tags: STYLE
      },
      3: {
        primary_subject: "a courier witnessing the motionless Hollow Chorus",
        primary_action: "freezing in fear above the encampment",
        required_elements: ["lone courier on foot", "thirty-four motionless robed figures", "cave mouth", "figures facing downward", "no horses"],
        forbidden_drift: ["single traveler only", "horse rider", "empty canyon", "battle", "figures walking away"],
        environment: "rocky hillside above a mountain encampment",
        background_element: "dark cave mouth below the courier",
        framing: "wide shot with courier foreground and robed crowd visible below",
        mood: "witnessed wrongness and rising panic",
        style_tags: STYLE
      },
      4: {
        primary_subject: "a hidden field journal beneath academic papers",
        primary_action: "revealing the suppressed warning without readable words",
        required_elements: ["desk", "blank maps", "academic papers", "worn field journal", "illegible charcoal strokes", "single candle"],
        forbidden_drift: ["readable text", "person writing", "modern study", "bright library"],
        environment: "candlelit study interior",
        background_element: "shelves of old leather-bound volumes",
        framing: "close still-life shot on desk evidence",
        mood: "suppressed truth and academic denial",
        style_tags: STYLE
      },
      5: {
        primary_subject: "an impossible presence deep beneath the mountain",
        primary_action: "pressing its weight through an immense cavern",
        required_elements: ["vast underground cavern", "dark stone walls", "embedded human witnesses", "open eyes", "faint mineral veins"],
        forbidden_drift: ["dragon", "humanoid monster body", "bright treasure cave", "temple altar"],
        environment: "impossibly large underground cavern",
        background_element: "thirty-four preserved figures embedded in stone",
        framing: "distant overhead scale shot",
        mood: "crushing patience and cosmic pressure",
        style_tags: STYLE
      },
      6: {
        primary_subject: "children drawing the forbidden mountain symbol",
        primary_action: "actively drawing the same symbol on slates and parchment",
        required_elements: ["several children", "floor drawing", "repeated black spiral-like symbol", "worried adults in doorway", "mountain silhouette through window"],
        forbidden_drift: ["adult ritual circle", "single symbol object", "pyramid", "readable writing", "outdoor scene"],
        environment: "low stone-and-thatch village room at night",
        background_element: "small window with mountain silhouette outside",
        framing: "medium-wide interior scene focused on children drawing",
        mood: "domestic dread and spreading influence",
        style_tags: STYLE
      },
      7: {
        primary_subject: "a child's hand drawing the forbidden angular symbol",
        primary_action: "marking the symbol in charcoal on a rough floor",
        required_elements: ["child's hand", "charcoal", "rough wooden floor", "repeated symbol papers", "blurred mountain through window"],
        forbidden_drift: ["pyramid object", "desk model", "abstract altar", "readable writing", "adult hand only"],
        environment: "quiet village room before dawn",
        background_element: "nameless mountain silhouette blurred through a low window",
        framing: "extreme close-up on the hand and symbol",
        mood: "intimate horror and campaign-hook dread",
        style_tags: STYLE
      }
    }
  }
};

function applyBeatLocks(promptPackage) {
  const config = BEAT_LOCKS[promptPackage.topic_id];

  if (!config) {
    throw new Error("No beat lock config for " + promptPackage.topic_id);
  }

  promptPackage.thumbnail_beat_lock = config.thumbnail_beat_lock;

  promptPackage.scenes = promptPackage.scenes.map((scene) => {
    const sceneNumber = Number(scene.scene_number);
    const beatLock = config.scenes[sceneNumber];

    if (!beatLock) {
      throw new Error("No beat lock for " + promptPackage.topic_id + " scene " + sceneNumber);
    }

    return {
      ...scene,
      beat_lock: beatLock
    };
  });

  promptPackage.beat_lock_migrated_at = new Date().toISOString();
  return promptPackage;
}

async function main() {
  try {
    logInfo("Migrating launch prompt packages to beat_lock schema...");

    for (const topicId of Object.keys(BEAT_LOCKS)) {
      const packagePath = path.join(VISUAL_ROOT, topicId, "image-prompt-package.json");
      const promptPackage = await readJson(packagePath, "image prompt package for " + topicId);
      await writeJson(packagePath, applyBeatLocks(promptPackage));
      logInfo("Migrated beat locks for: " + topicId);
    }

    logInfo("Beat-lock migration complete.");
  } catch (error) {
    logError(error.message);
    process.exitCode = 1;
  }
}

await main();
