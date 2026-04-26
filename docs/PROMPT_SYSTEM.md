# Prompt System - Beat Locked Image Generation

## Purpose

Ember & Stone image prompts must not drift into generic dark fantasy mood art.

Every image must lock onto a specific script beat.

## Required Beat Lock Schema

Each thumbnail or scene should define a beat lock object with these required fields:

- primary_subject
- primary_action
- required_elements array
- forbidden_drift array
- environment
- background_element
- framing
- mood

Optional:

- style_tags array

## Why This Exists

The image model can produce high-quality dark fantasy art while still missing the exact story beat.

That means loose mood prompts are not enough.

## Rules

1. Every scene must define one main beat only.
2. The prompt compiler must build the final prompt from structured beat-lock fields.
3. The strict audit must fail if beat-lock fields are missing or vague.
4. A beautiful image is not approved unless it matches the exact script beat.
5. Failed images go to rejected output and only failed images are regenerated.

## Example Beat Lock Object

{
  "primary_subject": "a dead scholar",
  "primary_action": "slumped motionless at a desk",
  "required_elements": ["blank journals", "single candle", "wrist mark"],
  "forbidden_drift": ["actively writing", "smiling", "crowded room", "readable text"],
  "environment": "quiet study room",
  "background_element": "empty shelves and a dim window",
  "framing": "medium-wide shot",
  "mood": "cold aftermath and eerie stillness",
  "style_tags": ["dark fantasy", "cinematic", "high detail"]
}
