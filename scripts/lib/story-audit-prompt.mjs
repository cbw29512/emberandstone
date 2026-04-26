// scripts/lib/story-audit-prompt.mjs
// Purpose: Build the production-grade story audit prompt.
// Why: The runner stays small and the audit schema remains reusable.

export function buildStoryAuditPrompt(projectContext, topic, draft) {
  return JSON.stringify({
    task: "Audit this Ember & Stone script for production-grade story structure.",
    project_context: projectContext,
    scoring_rules: {
      minimum_passing_score_per_section: 8,
      pass_requires_all_sections_present: true,
      pass_requires_no_ip_safety_flags: true
    },
    required_structure: [
      "Beginning: hook, premise, place, threat, or mystery appears quickly.",
      "Middle: lore develops through escalation, discovery, consequence, or revelation.",
      "Summary: the script ties together what the lore means before the ending.",
      "Ending: the script closes with final danger, mystery, or campaign-ready hook.",
      "Focus: the script stays on exactly one topic and does not wander.",
      "Completeness: it feels like a complete lore episode, not disconnected atmosphere.",
      "IP safety: original fantasy lore only; no protected D&D setting/character drift."
    ],
    required_json_output: {
      topic_id: "string",
      pass: "boolean",
      scores: {
        beginning: "number 0-10",
        middle: "number 0-10",
        summary: "number 0-10",
        ending: "number 0-10",
        focus: "number 0-10",
        completeness: "number 0-10",
        ip_safety: "number 0-10"
      },
      beginning: { present: "boolean", notes: "string" },
      middle: { present: "boolean", notes: "string" },
      summary: { present: "boolean", notes: "string" },
      ending: { present: "boolean", notes: "string" },
      focus: { single_topic: "boolean", no_drift: "boolean", notes: "string" },
      ip_safety: { safe_original_lore: "boolean", flagged_terms: ["string"], notes: "string" },
      required_fixes: ["string"]
    },
    topic,
    script_draft: draft
  }, null, 2);
}
