// scripts/validate-video-render-policy.mjs
// Purpose: Validate the review video cadence policy.
// Why: The renderer depends on this source of truth.

import { readVideoRenderPolicy } from "./lib/video-render-policy.mjs";

async function main() {
  try {
    const policy = await readVideoRenderPolicy(process.cwd());

    if (policy.minimum_seconds_per_image > policy.target_seconds_per_image) {
      throw new Error("minimum_seconds_per_image cannot exceed target_seconds_per_image.");
    }

    if (policy.target_seconds_per_image > policy.maximum_seconds_per_image) {
      throw new Error("target_seconds_per_image cannot exceed maximum_seconds_per_image.");
    }

    console.log("[PASS] video render policy validation passed.");
  } catch (error) {
    console.error("[FAIL] video render policy validation failed: " + error.message);
    process.exitCode = 1;
  }
}

await main();