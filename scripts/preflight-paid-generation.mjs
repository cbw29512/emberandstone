// scripts/preflight-paid-generation.mjs
// Purpose: Run every no-credit safety gate before paid image generation.
// Why: Ember & Stone is long-running, so paid generation must never start from unsafe state.

import fs from "node:fs";
import { spawnSync } from "node:child_process";

function logInfo(message) {
  console.log("[INFO] " + message);
}

function fail(message) {
  throw new Error(message);
}

function runCommand(command, args, label) {
  logInfo("Running: " + label);

  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: true
  });

  if (result.error) {
    fail(label + " failed to start: " + result.error.message);
  }

  if (result.status !== 0) {
    fail(label + " failed with exit code " + result.status);
  }
}

function captureCommand(command, args, label) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    shell: true
  });

  if (result.error) {
    fail(label + " failed to start: " + result.error.message);
  }

  if (result.status !== 0) {
    fail(label + " failed with exit code " + result.status + "\n" + result.stderr);
  }

  return String(result.stdout || "").trim();
}

function assertFileExists(filePath) {
  if (!fs.existsSync(filePath)) {
    fail("Missing required file: " + filePath);
  }
}

function assertGitClean() {
  const status = captureCommand("git", ["status", "--porcelain"], "git status --porcelain");

  if (status.length > 0) {
    console.log(status);
    fail("Working tree is not clean. Commit or intentionally handle changes before paid generation.");
  }
}

function assertApiKeysProtected() {
  assertFileExists("APIKeys.txt");

  const ignored = captureCommand("git", ["check-ignore", "-v", "APIKeys.txt"], "git check-ignore APIKeys.txt");

  if (!ignored.includes("APIKeys.txt")) {
    fail("APIKeys.txt is not protected by .gitignore.");
  }
}

function assertLeonardoKeyPresent() {
  const raw = fs.readFileSync("APIKeys.txt", "utf8");
  const line = raw.split(/\r?\n/).find((item) => item.trim().startsWith("LEONARDO_API_KEY="));

  if (!line) {
    fail("LEONARDO_API_KEY line missing from APIKeys.txt.");
  }

  const value = line.replace(/^LEONARDO_API_KEY=/, "").trim();

  if (!value) {
    fail("LEONARDO_API_KEY is empty.");
  }

  if (/paste_|your_|here/i.test(value)) {
    fail("LEONARDO_API_KEY still looks like a placeholder.");
  }

  logInfo("Leonardo key exists. Value was not printed.");
}

function assertSourceOfTruthFiles() {
  const files = [
    "content/channel-style.json",
    "docs/CHANNEL_STYLE_BIBLE.md",
    "content/image-model-policy.json",
    "docs/IMAGE_MODEL_POLICY.md",
    "scripts/generate-leonardo-final-images.mjs",
    "scripts/lib/channel-style.mjs",
    "scripts/lib/image-model-policy.mjs",
    "scripts/lib/image-prompt-compiler.mjs"
  ];

  for (const file of files) {
    assertFileExists(file);
  }
}

async function main() {
  try {
    logInfo("Starting paid-generation preflight...");

    assertSourceOfTruthFiles();
    assertApiKeysProtected();
    assertLeonardoKeyPresent();

    runCommand("npm", ["run", "validate:channel-style"], "validate channel style");
    runCommand("npm", ["run", "validate:image-model-policy"], "validate image model policy");
    runCommand("npm", ["run", "test:image-model-policy-loader"], "test image model policy loader");
    runCommand("npm", ["run", "test:image-prompt-compiler"], "test image prompt compiler");
    runCommand("npm", ["run", "audit:image-prompts:strict"], "strict image prompt audit");
    runCommand("npm", ["run", "preview:failed-image-prompts"], "preview compiled prompts");

    assertGitClean();

    logInfo("Paid-generation preflight passed.");
  } catch (error) {
    console.error("[ERROR] " + error.message);
    process.exitCode = 1;
  }
}

await main();
