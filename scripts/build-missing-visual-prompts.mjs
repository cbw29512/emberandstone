// scripts/build-missing-visual-prompts.mjs
// Purpose: Write reviewable prompt packages for missing final visuals.
// Why: We inspect prompts before spending Leonardo credits.

import fs from "node:fs/promises";
import path from "node:path";
import { buildMissingVisualPromptPackages } from "./lib/missing-visual-prompt-builder.mjs";

function promptPackageToMarkdown(pkg) {
  const lines = [
    "# Missing Visual Prompts: " + pkg.topic_id,
    "",
    "- Required unique visual slots: " + pkg.required_unique_visual_slots,
    "- Current unique scene images: " + pkg.current_unique_scene_images,
    "- Additional unique images needed: " + pkg.additional_unique_images_needed,
    "- Prompt count: " + pkg.prompt_count,
    ""
  ];

  for (const prompt of pkg.prompts) {
    lines.push("## " + prompt.suggested_file_label);
    lines.push("");
    lines.push("- Planned slot: " + prompt.planned_slot_number);
    lines.push("- Source scene: " + prompt.source_scene_number);
    lines.push("- Source title: " + prompt.source_scene_title);
    lines.push("");
    lines.push("### Prompt");
    lines.push(prompt.prompt);
    lines.push("");
    lines.push("### Negative Prompt");
    lines.push(prompt.negative_prompt);
    lines.push("");
  }

  return lines.join("\n");
}

async function main() {
  try {
    const rootDir = process.cwd();
    const packages = await buildMissingVisualPromptPackages(rootDir);

    for (const pkg of packages) {
      const topicDir = path.join(rootDir, "output", "visuals", pkg.topic_id);
      await fs.mkdir(topicDir, { recursive: true });

      const jsonPath = path.join(topicDir, "missing-image-prompts.json");
      const mdPath = path.join(topicDir, "missing-image-prompts.md");

      await fs.writeFile(jsonPath, JSON.stringify(pkg, null, 2));
      await fs.writeFile(mdPath, promptPackageToMarkdown(pkg));

      console.log("[INFO] " + pkg.topic_id);
      console.log("[INFO] Missing prompt count: " + pkg.prompt_count);
      console.log("[INFO] Saved: " + mdPath);
    }
  } catch (error) {
    console.error("[ERROR] Missing visual prompt build failed: " + error.message);
    process.exitCode = 1;
  }
}

await main();
