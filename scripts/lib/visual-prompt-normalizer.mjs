// scripts/lib/visual-prompt-normalizer.mjs
// Purpose: Convert legacy image prompt strings into strict prompt objects.
// Why: Production image generation must pass strict visual gates before spending Leonardo credits.
// Compatibility rule:
// - Preserve text in *_text fields.
// - Store strict objects in thumbnail_prompt, thumbnail, scene.image_prompt, scene.prompt, and scene.visual_prompt.

const DEFAULT_NEGATIVE_PROMPT = [
  "text",
  "letters",
  "logos",
  "watermark",
  "signature",
  "modern clothing",
  "modern city",
  "sci-fi",
  "neon",
  "official D&D art",
  "copyrighted characters",
  "playful cartoon style",
  "anime style"
];

function asCleanString(value) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (value && typeof value === "object") {
    return String(value.prompt_text || value.prompt || value.image_must_show || "").trim();
  }

  return "";
}

function splitRequiredElements(text) {
  const clean = asCleanString(text);

  if (!clean) {
    return [];
  }

  return clean
    .split(/[,.]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function buildStrictPromptObject({
  kind,
  title,
  promptText,
  narrationSummary,
  negativePrompt
}) {
  const cleanPrompt = asCleanString(promptText);
  const cleanSummary = asCleanString(narrationSummary);
  const cleanTitle = asCleanString(title);

  const promptSubject = cleanSummary || cleanPrompt || cleanTitle;

  return {
    prompt_text: cleanPrompt,
    prompt: cleanPrompt,
    image_must_show: promptSubject,
    main_action: cleanSummary || "Show the central story beat clearly.",
    required_visible_elements: splitRequiredElements(cleanPrompt),
    environment: cleanPrompt,
    background: cleanPrompt,
    camera_and_framing: kind === "thumbnail"
      ? "strong readable thumbnail composition with one clear focal point"
      : "cinematic story-beat composition with clear subject and readable action",
    emotional_mood: "dark fantasy, ominous, ancient, eerie, serious, mythic",
    do_not_show_or_imply: DEFAULT_NEGATIVE_PROMPT,
    negative_prompt: asCleanString(negativePrompt) || DEFAULT_NEGATIVE_PROMPT.join(", "),
    style: "dark fantasy lore illustration, cinematic, high detail, strong focal point, moody atmosphere, no readable text",
    production_status: "strict_prompt_ready"
  };
}

export function normalizeStrictImagePromptPackage(promptPackage) {
  if (!promptPackage || typeof promptPackage !== "object") {
    throw new Error("Image prompt package must be an object.");
  }

  const thumbnailPromptText = asCleanString(
    promptPackage.thumbnail_prompt_text
      || promptPackage.thumbnail_prompt
      || promptPackage.thumbnail
  );

  const thumbnailObject = buildStrictPromptObject({
    kind: "thumbnail",
    title: promptPackage.final_video_title || promptPackage.topic_title,
    promptText: thumbnailPromptText,
    narrationSummary: promptPackage.topic_title,
    negativePrompt: "text, letters, logos, watermark, signature, modern objects, copyrighted character lookalikes"
  });

  const normalizedScenes = Array.isArray(promptPackage.scenes)
    ? promptPackage.scenes.map((scene) => {
        const promptText = asCleanString(
          scene.image_prompt_text
            || scene.image_prompt
            || scene.visual_prompt
            || scene.prompt
        );

        const strictPromptObject = buildStrictPromptObject({
          kind: "scene",
          title: scene.scene_title,
          promptText,
          narrationSummary: scene.narration_summary,
          negativePrompt: scene.negative_prompt
        });

        return {
          ...scene,
          image_prompt_text: promptText,
          image_prompt: strictPromptObject,
          prompt: strictPromptObject,
          visual_prompt: strictPromptObject
        };
      })
    : [];

  const promptObjects = {
    thumbnail: thumbnailObject
  };

  for (const scene of normalizedScenes) {
    promptObjects["scene-" + scene.scene_number] = scene.image_prompt;
  }

  return {
    ...promptPackage,
    thumbnail_prompt_text: thumbnailPromptText,
    thumbnail_prompt: thumbnailObject,
    thumbnail: thumbnailObject,
    prompt_objects: promptObjects,
    prompts: promptObjects,
    image_prompts: promptObjects,
    visual_prompts: promptObjects,
    scenes: normalizedScenes,
    strict_prompt_schema_version: 3
  };
}
