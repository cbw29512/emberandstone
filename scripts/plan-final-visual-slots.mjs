// scripts/plan-final-visual-slots.mjs
// Purpose: Create final visual slot plans before spending image-generation credits.
// Why: Public videos need unique, script-relevant visuals around every 25 seconds.

import fs from "node:fs/promises";
import path from "node:path";
import { buildVisualSlotPlans } from "./lib/visual-slot-planner.mjs";

function planToMarkdown(plan) {
  const lines = [
    "# Visual Slot Plan: " + plan.topic_id,
    "",
    "- Duration seconds: " + plan.duration_seconds.toFixed(2),
    "- Target seconds per image: " + plan.target_seconds_per_image,
    "- Required unique visual slots: " + plan.required_unique_visual_slots,
    "- Current unique scene images: " + plan.current_unique_scene_images,
    "- Additional unique images needed: " + plan.additional_unique_images_needed,
    "- Status: " + plan.status,
    "",
    "## Missing New Image Slots",
    ""
  ];

  if (plan.missing_slots.length === 0) {
    lines.push("No additional unique images needed.");
    return lines.join("\n");
  }

  for (const slot of plan.missing_slots) {
    lines.push("### " + slot.suggested_file_label);
    lines.push("- Planned slot: " + slot.planned_slot_number);
    lines.push("- Source scene: " + slot.source_scene_number);
    lines.push("- Source title: " + slot.source_scene_title);
    lines.push("- Status: " + slot.status);
    lines.push("- Prompt strategy: " + slot.prompt_strategy);
    lines.push("");
  }

  return lines.join("\n");
}

async function main() {
  try {
    const rootDir = process.cwd();
    const plans = await buildVisualSlotPlans(rootDir);
    const outputRoot = path.join(rootDir, "output", "visual-slot-plans");

    await fs.mkdir(outputRoot, { recursive: true });

    for (const plan of plans) {
      const topicDir = path.join(outputRoot, plan.topic_id);
      await fs.mkdir(topicDir, { recursive: true });

      await fs.writeFile(
        path.join(topicDir, "visual-slot-plan.json"),
        JSON.stringify(plan, null, 2)
      );

      await fs.writeFile(
        path.join(topicDir, "visual-slot-plan.md"),
        planToMarkdown(plan)
      );

      console.log("[INFO] " + plan.topic_id);
      console.log("[INFO] Required slots: " + plan.required_unique_visual_slots);
      console.log("[INFO] Current images: " + plan.current_unique_scene_images);
      console.log("[INFO] Additional needed: " + plan.additional_unique_images_needed);
    }

    console.log("[INFO] Saved visual slot plans: " + outputRoot);
  } catch (error) {
    console.error("[ERROR] Visual slot planning failed: " + error.message);
    process.exitCode = 1;
  }
}

await main();
