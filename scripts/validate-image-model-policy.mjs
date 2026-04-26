// scripts/validate-image-model-policy.mjs
// Purpose: Validate the Ember & Stone image model policy.
// Why: Long-running production needs controlled model selection.

import fs from "node:fs/promises";
import path from "node:path";

const ROOT_DIR = process.cwd();
const POLICY_PATH = path.join(ROOT_DIR, "content", "image-model-policy.json");
const DOC_PATH = path.join(ROOT_DIR, "docs", "IMAGE_MODEL_POLICY.md");

function stripBom(text) {
  return text.replace(/^\uFEFF/, "");
}

function fail(message) {
  throw new Error(message);
}

function assertString(data, key) {
  if (typeof data[key] !== "string" || data[key].trim().length === 0) {
    fail("Missing string: " + key);
  }
}

function assertArray(data, key) {
  if (!Array.isArray(data[key]) || data[key].length === 0) {
    fail("Missing array: " + key);
  }
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(stripBom(raw));
}

function validateModelRole(roleName, role) {
  assertString(role, "model_id");
  assertString(role, "model_name");
  assertString(role, "status");
  assertArray(role, "observed_strengths");
  assertArray(role, "observed_failures");

  if (!Array.isArray(role.use_for)) {
    fail(roleName + " use_for must be an array.");
  }

  if (!Array.isArray(role.do_not_use_for)) {
    fail(roleName + " do_not_use_for must be an array.");
  }
}

async function main() {
  try {
    console.log("[INFO] Validating image model policy...");

    const policy = await readJson(POLICY_PATH);

    assertString(policy, "channel_name");
    assertString(policy, "purpose");
    assertString(policy, "default_model_id");
    assertString(policy, "default_model_name");
    assertString(policy, "policy_status");
    assertArray(policy, "selection_rules");

    if (!policy.model_roles || typeof policy.model_roles !== "object") {
      fail("Missing model_roles object.");
    }

    for (const [roleName, role] of Object.entries(policy.model_roles)) {
      validateModelRole(roleName, role);
    }

    if (!policy.scene_risk_categories) {
      fail("Missing scene_risk_categories.");
    }

    assertArray(policy.scene_risk_categories, "low_risk");
    assertArray(policy.scene_risk_categories, "high_risk");

    if (!policy.promotion_requirements) {
      fail("Missing promotion_requirements.");
    }

    assertArray(policy.promotion_requirements, "must_pass");

    const doc = await fs.readFile(DOC_PATH, "utf8");

    if (!doc.includes("Current Model Roles")) {
      fail("IMAGE_MODEL_POLICY.md missing Current Model Roles section.");
    }

    if (!doc.includes("Long-Running Rule")) {
      fail("IMAGE_MODEL_POLICY.md missing Long-Running Rule section.");
    }

    console.log("[INFO] Image model policy validation passed.");
  } catch (error) {
    console.error("[ERROR] " + error.message);
    process.exitCode = 1;
  }
}

await main();