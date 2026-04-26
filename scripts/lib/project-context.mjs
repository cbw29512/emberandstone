// scripts/lib/project-context.mjs
// Purpose: Read the permanent project rules.
// Why: Every generation step should stay anchored to PROJECT_CONTEXT.md.

import fs from "node:fs/promises";
import path from "node:path";

export async function readProjectContext(rootDir) {
  try {
    const contextPath = path.join(rootDir, "PROJECT_CONTEXT.md");
    return await fs.readFile(contextPath, "utf8");
  } catch {
    return "Use original Ember & Stone lore. Avoid protected D&D lore. One topic, one video.";
  }
}
