// scripts/lib/image-prompt-compiler.mjs
// Purpose: Compile structured beat-lock fields into stronger image prompts.
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
    "Primary subject: " + lock.primary_subject + ".",
    "Primary action: " + lock.primary_action + ".",
    "Required visible elements: " + lock.required_elements.join(", ") + ".",
    "Environment: " + lock.environment + ".",
    "Background element: " + lock.background_element + ".",
    "Framing: " + lock.framing + ".",
    "Mood: " + lock.mood + ".",
    "Must not drift into: " + lock.forbidden_drift.join(", ") + "."
  ];

  if (lock.style_tags.length > 0) {
    sections.push("Style tags: " + lock.style_tags.join(", ") + ".");
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
