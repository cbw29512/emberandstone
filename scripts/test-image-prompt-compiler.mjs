// scripts/test-image-prompt-compiler.mjs
// Purpose: Unit test the beat-lock prompt compiler.
// Why: Prompt architecture must be reliable before it controls paid image generation.

import assert from "node:assert/strict";
import {
  compileBeatLockedPrompt,
  buildNegativePrompt,
  validateBeatLock
} from "./lib/image-prompt-compiler.mjs";

try {
  const beatLock = {
    primary_subject: "a dead scholar",
    primary_action: "slumped motionless at a wooden desk",
    required_elements: ["blank journals", "single candle", "wrist mark"],
    forbidden_drift: ["actively writing", "smiling", "crowded room"],
    environment: "quiet study room",
    background_element: "empty shelves and a dim window",
    framing: "medium-wide shot",
    mood: "cold aftermath and eerie stillness",
    style_tags: ["dark fantasy", "cinematic", "high detail"]
  };

  const validated = validateBeatLock(beatLock);
  assert.equal(validated.primary_subject, "a dead scholar");

  const prompt = compileBeatLockedPrompt(
    beatLock,
    "dark fantasy illustration, strong focal point, no readable text"
  );

  assert.ok(prompt.includes("Primary subject: a dead scholar."));
  assert.ok(prompt.includes("Primary action: slumped motionless at a wooden desk."));
  assert.ok(prompt.includes("Must not drift into: actively writing, smiling, crowded room."));

  const negatives = buildNegativePrompt(["gore"]);
  assert.ok(negatives.includes("text"));
  assert.ok(negatives.includes("logos"));
  assert.ok(negatives.includes("gore"));

  console.log("[PASS] image prompt compiler test passed.");
} catch (error) {
  console.error("[FAIL] image prompt compiler test failed: " + error.message);
  process.exitCode = 1;
}
