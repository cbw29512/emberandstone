// scripts/lib/json-utils.mjs
// Purpose: Centralize safe JSON file reading/writing.
// Why: Every pipeline step depends on clean JSON state, so we keep this logic reusable.

import fs from "node:fs/promises";
import path from "node:path";

export function logInfo(message) {
  console.log("[INFO] " + message);
}

export function logError(message) {
  console.error("[ERROR] " + message);
}

export async function readJson(filePath, label) {
  try {
    const rawText = (await fs.readFile(filePath, "utf8")).replace(/^\uFEFF/, "");

    try {
      return JSON.parse(rawText);
    } catch (jsonError) {
      throw new Error(label + " is not valid JSON: " + jsonError.message);
    }
  } catch (error) {
    throw new Error("Failed to read " + label + ": " + error.message);
  }
}

export async function writeJson(filePath, data) {
  try {
    const json = JSON.stringify(data, null, 2) + "\n";
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, json, "utf8");
  } catch (error) {
    throw new Error("Failed to write JSON file: " + error.message);
  }
}

export async function writeText(filePath, text) {
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, text, "utf8");
  } catch (error) {
    throw new Error("Failed to write text file: " + error.message);
  }
}
