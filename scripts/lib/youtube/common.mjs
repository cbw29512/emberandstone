// scripts/lib/youtube/common.mjs
// Purpose: Shared safe helpers for YouTube upload scripts.

import fs from "node:fs/promises";
import path from "node:path";

export function logInfo(message) {
  console.log("[INFO] " + message);
}

export function logWarn(message) {
  console.warn("[WARN] " + message);
}

export function fail(message) {
  throw new Error(message);
}

export function stripBom(value) {
  return String(value || "").replace(/^\uFEFF/, "");
}

export async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(stripBom(raw));
}

export async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}