// scripts/audit-missing-visual-prompts.mjs
// Purpose: Audit missing-image prompt packages before spending Leonardo credits.
// Why: Final video visuals must be unique, script-relevant, and channel-consistent.

import fs from "node:fs/promises";
import path from "node:path";

const ROOT_DIR = process.cwd();
const VISUALS_ROOT = path.join(ROOT_DIR, "output", "visuals");

function fail(message) {
  throw new Error(message);
}

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw.replace(/^\uFEFF/, ""));
}

function requireIncludes(text, needle, context) {
  if (!text.toLowerCase().includes(needle.toLowerCase())) {
    fail(context + " missing required phrase: " + needle);
  }
}

function requirePromptScriptLink(prompt, context) {
  const hasNarration = prompt.includes("Narration beat:");
  const hasSceneDirection = prompt.includes("Existing scene direction to evolve from:");
  const hasBeatLock = prompt.includes("Scene beat lock data:");

  if (!hasNarration && !hasSceneDirection && !hasBeatLock) {
    fail(context + " has no script/scene linkage.");
  }
}

function auditPromptItem(item, seenLabels, seenPrompts) {
  const context = item.topic_id + " / " + item.suggested_file_label;
  const prompt = cleanText(item.prompt);
  const negative = cleanText(item.negative_prompt);

  if (!Number.isFinite(Number(item.planned_slot_number))) {
    fail(context + " missing planned_slot_number.");
  }

  if (!cleanText(item.suggested_file_label)) {
    fail(context + " missing suggested_file_label.");
  }

  if (seenLabels.has(item.suggested_file_label)) {
    fail(context + " duplicate suggested_file_label.");
  }

  seenLabels.add(item.suggested_file_label);

  if (prompt.length < 300) {
    fail(context + " prompt is too short to be production-safe.");
  }

  if (seenPrompts.has(prompt)) {
    fail(context + " duplicate prompt body.");
  }

  seenPrompts.add(prompt);

  requireIncludes(prompt, "CHANNEL CONSISTENCY LOCK", context);
  requireIncludes(prompt, "UNIQUE FINAL VIDEO VISUAL", context);
  requireIncludes(prompt, "must not reuse", context);
  requireIncludes(prompt, "fresh camera angle", context);
  requireIncludes(prompt, "Scene title:", context);
  requirePromptScriptLink(prompt, context);

  requireIncludes(negative, "duplicate composition", context);
  requireIncludes(negative, "text", context);
  requireIncludes(negative, "logos", context);
  requireIncludes(negative, "watermark", context);
  requireIncludes(negative, "copyrighted characters", context);

  if (prompt.length > 5000) {
    console.warn("[WARN] " + context + " prompt is long: " + prompt.length + " characters.");
  }
}

function auditPackage(pkg) {
  if (!cleanText(pkg.topic_id)) {
    fail("Package missing topic_id.");
  }

  if (!Array.isArray(pkg.prompts)) {
    fail(pkg.topic_id + " prompts must be an array.");
  }

  if (pkg.prompt_count !== pkg.prompts.length) {
    fail(pkg.topic_id + " prompt_count does not match prompts length.");
  }

  if (pkg.additional_unique_images_needed !== pkg.prompts.length) {
    fail(pkg.topic_id + " additional_unique_images_needed does not match prompts length.");
  }

  const seenLabels = new Set();
  const seenPrompts = new Set();

  for (const item of pkg.prompts) {
    auditPromptItem(item, seenLabels, seenPrompts);
  }

  console.log("[PASS] " + pkg.topic_id + " prompt audit passed. Count: " + pkg.prompts.length);
}

async function main() {
  try {
    const entries = await fs.readdir(VISUALS_ROOT, { withFileTypes: true });
    let packageCount = 0;
    let totalPrompts = 0;

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const packagePath = path.join(VISUALS_ROOT, entry.name, "missing-image-prompts.json");

      if (!(await pathExists(packagePath))) continue;

      const pkg = await readJson(packagePath);
      auditPackage(pkg);

      packageCount += 1;
      totalPrompts += pkg.prompts.length;
    }

    if (packageCount === 0) {
      fail("No missing-image prompt packages found.");
    }

    console.log("[PASS] Missing visual prompt audit passed.");
    console.log("[INFO] Packages audited: " + packageCount);
    console.log("[INFO] Total prompts audited: " + totalPrompts);
  } catch (error) {
    console.error("[FAIL] Missing visual prompt audit failed: " + error.message);
    process.exitCode = 1;
  }
}

await main();
