// scripts/test-image-model-policy-loader.mjs
// Purpose: Test loading the image model policy.
// Why: The final image generator depends on this before paid image generation.

import assert from "node:assert/strict";
import {
  readImageModelPolicy,
  getDefaultImageModel
} from "./lib/image-model-policy.mjs";

try {
  const policy = await readImageModelPolicy(process.cwd());
  const model = getDefaultImageModel(policy);

  assert.equal(model.model_id, policy.default_model_id);
  assert.equal(model.model_name, policy.default_model_name);
  assert.ok(model.model_id.length > 0);
  assert.ok(model.model_name.length > 0);

  console.log("[PASS] image model policy loader test passed.");
} catch (error) {
  console.error("[FAIL] image model policy loader test failed: " + error.message);
  process.exitCode = 1;
}
