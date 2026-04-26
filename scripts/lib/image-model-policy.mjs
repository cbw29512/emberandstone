// scripts/lib/image-model-policy.mjs
// Purpose: Load the Ember & Stone image model selection policy.
// Why: Long-running production should not blindly hardcode one image model forever.

import fs from "node:fs/promises";
import path from "node:path";

function stripBom(text) {
  return text.replace(/^\uFEFF/, "");
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

export async function readImageModelPolicy(rootDir) {
  try {
    const policyPath = path.join(rootDir, "content", "image-model-policy.json");
    const raw = await fs.readFile(policyPath, "utf8");
    const policy = JSON.parse(stripBom(raw));

    if (!cleanString(policy.default_model_id)) {
      throw new Error("image-model-policy.json missing default_model_id.");
    }

    if (!cleanString(policy.default_model_name)) {
      throw new Error("image-model-policy.json missing default_model_name.");
    }

    return policy;
  } catch (error) {
    throw new Error("Could not read image model policy: " + error.message);
  }
}

export function getDefaultImageModel(policy) {
  if (!policy || typeof policy !== "object") {
    throw new Error("Image model policy must be an object.");
  }

  const modelId = cleanString(policy.default_model_id);
  const modelName = cleanString(policy.default_model_name);

  if (!modelId || !modelName) {
    throw new Error("Image model policy default model is incomplete.");
  }

  return {
    model_id: modelId,
    model_name: modelName
  };
}
