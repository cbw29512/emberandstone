// scripts/lib/audio-file-utils.mjs
// Purpose: Shared file helpers for audio generation.
// Why: Audio scripts need safe reads and byte checks without duplicating logic.

import fs from "node:fs/promises";

export async function readText(filePath, label) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    throw new Error("Failed to read " + label + ": " + error.message);
  }
}

export async function fileSizeBytes(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return stat.size;
  } catch {
    return 0;
  }
}
