// scripts/lib/narration-utils.mjs
// Purpose: Reusable narration helpers.
// Why: Script tightening and voice packaging both need stable word-count logic.

export function countWords(text) {
  return String(text || "").trim().split(/\s+/).filter(Boolean).length;
}

export function cleanNarration(text) {
  return String(text || "")
    .replace(/^```[a-zA-Z]*\s*/g, "")
    .replace(/```$/g, "")
    .replace(/^narration_script\s*[:=]\s*/i, "")
    .trim();
}

export function sentenceTrim(text, maxWords) {
  const sentences = cleanNarration(text).match(/[^.!?]+[.!?]+|\S.+$/g) || [];
  const kept = [];

  for (const sentence of sentences) {
    const candidate = [...kept, sentence.trim()].join(" ");

    if (countWords(candidate) > maxWords) {
      break;
    }

    kept.push(sentence.trim());
  }

  return kept.join(" ").trim();
}
