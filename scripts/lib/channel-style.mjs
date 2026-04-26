// scripts/lib/channel-style.mjs
// Purpose: Load and compile the permanent Ember & Stone channel style canon.
// Why: Every generated image must inherit the same channel-wide visual identity.

import fs from "node:fs/promises";
import path from "node:path";

function stripBom(rawText) {
  return rawText.replace(/^\uFEFF/, "");
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanArray(value) {
  return Array.isArray(value)
    ? value.map((item) => cleanString(item)).filter(Boolean)
    : [];
}

function sentence(label, values) {
  const list = cleanArray(values);

  if (list.length === 0) {
    return "";
  }

  return label + ": " + list.join(", ") + ".";
}

export async function readChannelStyle(rootDir) {
  const stylePath = path.join(rootDir, "content", "channel-style.json");
  const raw = await fs.readFile(stylePath, "utf8");
  const style = JSON.parse(stripBom(raw));

  if (!cleanString(style.generation_instruction)) {
    throw new Error("channel-style.json missing generation_instruction.");
  }

  return style;
}

export function buildChannelStylePrompt(style) {
  const sections = [
    "CHANNEL CONSISTENCY LOCK.",
    cleanString(style.generation_instruction),
    sentence("Permanent Ember & Stone visual identity", style.visual_identity),
    sentence("Permanent channel palette", style.palette),
    sentence("Permanent lighting language", style.lighting),
    sentence("Permanent mood", style.mood),
    sentence("Common environment language", style.environment_language),
    sentence("Common character language", style.character_language),
    sentence("Common object language", style.object_language),
    sentence("Forbidden channel drift", style.forbidden_drift),
    "Every image must look like it belongs to the same long-running Ember & Stone channel."
  ];

  return sections.filter(Boolean).join(" ");
}
