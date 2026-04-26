// scripts/lib/image-prompt-validator.mjs
// Purpose: Validate image prompt packages before image generation.
// Why: Blank prompts waste credits and create unusable videos.

function isBlank(value) {
  return String(value || "").trim() === "";
}

export function validatePromptPackage(topicId, promptPackage) {
  const failures = [];

  if (isBlank(promptPackage.thumbnail_prompt)) {
    failures.push("Missing thumbnail_prompt.");
  }

  if (!Array.isArray(promptPackage.scenes) || promptPackage.scenes.length === 0) {
    failures.push("Missing scenes array.");
  }

  for (const scene of promptPackage.scenes || []) {
    if (isBlank(scene.scene_title) || String(scene.scene_title).startsWith("Scene ")) {
      failures.push("Scene " + scene.scene_number + " has weak or missing title.");
    }

    if (isBlank(scene.narration_summary)) {
      failures.push("Scene " + scene.scene_number + " missing narration_summary.");
    }

    if (isBlank(scene.image_prompt)) {
      failures.push("Scene " + scene.scene_number + " missing image_prompt.");
    }
  }

  if (failures.length > 0) {
    throw new Error("Invalid image prompt package for " + topicId + ": " + failures.join(" | "));
  }
}
