// scripts/lib/scene-field-normalizer.mjs
// Purpose: Normalize scene fields from AI script drafts.
// Why: Different AI drafts may use scene_title, title, visual_prompt, image_prompt, etc.

function textFromValue(value) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (Array.isArray(value)) {
    return value.map(textFromValue).filter(Boolean).join(" ").trim();
  }

  if (value && typeof value === "object") {
    const preferredKeys = [
      "prompt",
      "description",
      "summary",
      "text",
      "title",
      "visual_prompt",
      "image_prompt"
    ];

    for (const key of preferredKeys) {
      const extracted = textFromValue(value[key]);

      if (extracted) {
        return extracted;
      }
    }
  }

  return "";
}

function pickText(source, keys) {
  for (const key of keys) {
    const value = textFromValue(source[key]);

    if (value) {
      return value;
    }
  }

  return "";
}

export function normalizeScene(scene, index) {
  const sceneNumber = Number(
    scene.scene_number ||
    scene.sceneNumber ||
    scene.number ||
    scene.id ||
    index + 1
  );

  const title = pickText(scene, [
    "scene_title",
    "sceneTitle",
    "title",
    "name",
    "beat",
    "visual_title",
    "visualTitle"
  ]);

  const summary = pickText(scene, [
    "narration_summary",
    "narrationSummary",
    "summary",
    "script_summary",
    "scriptSummary",
    "voiceover_summary",
    "voiceoverSummary",
    "description",
    "narration"
  ]);

  const imagePrompt = pickText(scene, [
    "visual_prompt",
    "visualPrompt",
    "image_prompt",
    "imagePrompt",
    "prompt",
    "scene_prompt",
    "scenePrompt",
    "visual_description",
    "visualDescription",
    "image_description",
    "imageDescription"
  ]);

  return {
    scene_number: sceneNumber,
    scene_title: title || "Scene " + sceneNumber,
    narration_summary: summary,
    image_prompt: imagePrompt,
    source_keys: Object.keys(scene)
  };
}
