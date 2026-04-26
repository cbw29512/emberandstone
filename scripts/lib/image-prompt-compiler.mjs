// scripts/lib/image-prompt-compiler.mjs
// Purpose: Compile structured beat-lock fields into hard visual shot prompts.
// Why: Loose mood prompts create beautiful images that can miss the script beat.

import assert from "node:assert/strict";

const BASE_NEGATIVES = [
  "text",
  "letters",
  "logos",
  "watermark",
  "modern objects",
  "modern clothing",
  "official D&D art",
  "copyrighted characters"
];

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanArray(value) {
  return Array.isArray(value)
    ? value.map((item) => cleanString(item)).filter(Boolean)
    : [];
}

function requireString(value, name, label) {
  const cleaned = cleanString(value);
  assert.ok(cleaned, label + " missing required string field: " + name);
  return cleaned;
}

function requireArray(value, name, label) {
  const cleaned = cleanArray(value);
  assert.ok(cleaned.length > 0, label + " missing required array field: " + name);
  return cleaned;
}

export function validateBeatLock(beatLock, label = "beat_lock") {
  assert.ok(beatLock && typeof beatLock === "object", label + " must be an object");

  return {
    primary_subject: requireString(beatLock.primary_subject, "primary_subject", label),
    primary_action: requireString(beatLock.primary_action, "primary_action", label),
    required_elements: requireArray(beatLock.required_elements, "required_elements", label),
    forbidden_drift: requireArray(beatLock.forbidden_drift, "forbidden_drift", label),
    environment: requireString(beatLock.environment, "environment", label),
    background_element: requireString(beatLock.background_element, "background_element", label),
    framing: requireString(beatLock.framing, "framing", label),
    mood: requireString(beatLock.mood, "mood", label),
    style_tags: cleanArray(beatLock.style_tags)
  };
}

export function compileBeatLockedPrompt(beatLock, extraStyle = "") {
  const lock = validateBeatLock(beatLock);

  const sections = [
    "DARK FANTASY LORE ILLUSTRATION.",
    "This is a single story-beat image, not generic mood art.",
    "THE IMAGE MUST SHOW: " + lock.primary_subject + ".",
    "THE MAIN ACTION MUST BE: " + lock.primary_action + ".",
    "THE REQUIRED VISIBLE ELEMENTS ARE: " + lock.required_elements.join("; ") + ".",
    "THE ENVIRONMENT MUST BE: " + lock.environment + ".",
    "THE BACKGROUND MUST INCLUDE: " + lock.background_element + ".",
    "CAMERA AND FRAMING: " + lock.framing + ".",
    "EMOTIONAL MOOD: " + lock.mood + ".",
    "DO NOT SHOW OR IMPLY: " + lock.forbidden_drift.join("; ") + ".",
    "If the main action is not visible, the image is wrong.",
    "If required elements are missing, the image is wrong."
  ];

  if (lock.style_tags.length > 0) {
    sections.push("STYLE: " + lock.style_tags.join(", ") + ".");
  }

  if (cleanString(extraStyle)) {
    sections.push(cleanString(extraStyle));
  }

  return sections.join(" ");
}

export function buildNegativePrompt(extraNegatives = []) {
  const combined = [...BASE_NEGATIVES, ...cleanArray(extraNegatives)];
  return [...new Set(combined)].join(", ");
}
