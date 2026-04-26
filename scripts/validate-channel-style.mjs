// scripts/validate-channel-style.mjs
// Purpose: Validate the permanent Ember & Stone channel style source of truth.
// Why: Long-running production needs a stable visual canon before generation.

import fs from "node:fs/promises";
import path from "node:path";

const ROOT_DIR = process.cwd();
const STYLE_PATH = path.join(ROOT_DIR, "content", "channel-style.json");
const DOC_PATH = path.join(ROOT_DIR, "docs", "CHANNEL_STYLE_BIBLE.md");

const REQUIRED_ARRAYS = [
  "visual_identity",
  "palette",
  "lighting",
  "mood",
  "environment_language",
  "character_language",
  "object_language",
  "forbidden_drift"
];

function logInfo(message) {
  console.log("[INFO] " + message);
}

function fail(message) {
  throw new Error(message);
}

function stripBom(rawText) {
  return rawText.replace(/^\uFEFF/, "");
}

function assertArray(data, key) {
  if (!Array.isArray(data[key]) || data[key].length === 0) {
    fail("Missing or empty array: " + key);
  }
}

function assertString(data, key) {
  if (typeof data[key] !== "string" || data[key].trim().length === 0) {
    fail("Missing or empty string: " + key);
  }
}

async function readJsonFile(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(stripBom(raw));
  } catch (error) {
    throw new Error("Failed to read JSON file " + filePath + ": " + error.message);
  }
}

async function main() {
  try {
    logInfo("Validating channel style bible...");

    const data = await readJsonFile(STYLE_PATH);

    assertString(data, "channel_name");
    assertString(data, "purpose");
    assertString(data, "generation_instruction");
    assertString(data, "long_running_rule");

    for (const key of REQUIRED_ARRAYS) {
      assertArray(data, key);
    }

    if (!data.approval_rubric || typeof data.approval_rubric !== "object") {
      fail("Missing approval_rubric object.");
    }

    assertArray(data.approval_rubric, "must_pass");
    assertArray(data.approval_rubric, "hard_fail");
    assertArray(data.approval_rubric, "acceptable_flexibility");

    const doc = await fs.readFile(DOC_PATH, "utf8");

    if (!doc.includes("Channel Consistency Lock")) {
      fail("CHANNEL_STYLE_BIBLE.md missing Channel Consistency Lock section.");
    }

    if (!doc.includes("Long-Running Channel Rule")) {
      fail("CHANNEL_STYLE_BIBLE.md missing Long-Running Channel Rule section.");
    }

    logInfo("Channel style bible validation passed.");
  } catch (error) {
    console.error("[ERROR] " + error.message);
    process.exitCode = 1;
  }
}

await main();
