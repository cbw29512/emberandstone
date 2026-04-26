# Ember & Stone Pipeline Lessons

This file records verified project lessons so this channel-pipeline can be repeated for a different subject without relying on memory, guesses, or hallucinated assumptions.

## Verified Current Project

Local folder:

C:\Users\divcl\OneDrive\Desktop\EmberAndStone

GitHub repo:

https://github.com/cbw29512/emberandstone

## Repeatable Pipeline Blueprint

Use this sequence for Ember & Stone and future subject channels:

1. Create a source-of-truth project context.
2. Define topic queue and published state.
3. Run duplicate-topic guard.
4. Generate script package.
5. Generate AI script.
6. Repair malformed AI JSON if needed.
7. Tighten narration.
8. Audit story structure.
9. Generate voice package.
10. Test voice with short sample.
11. Generate full narration audio only after story passes.
12. Audit audio.
13. Audit production readiness.
14. Generate visuals/video only after quality gates pass.
15. Upload only after human review.

## Golden Rules

- One topic equals one video.
- A completed topic is never reused.
- Generated output does not mean publish-ready.
- First-pass AI output must never be posted raw.
- Models write prose; code owns JSON, schema, state, and manifests.
- Every generation step must respect PROJECT_CONTEXT.md.
- Every production step must run checks first.
- Every source file must stay under 150 lines.
- Split reusable code into scripts/lib modules.
- API keys and generated outputs must never be committed.
- Paid assets must be idempotent: never regenerate paid audio if a valid file already exists.
- Human review remains required before upload until the system proves consistent quality.

## What Worked

### PROJECT_CONTEXT.md

The root context file works as the project anchor.

It prevents drift in:

- tone
- content type
- channel direction
- IP safety
- quality rules
- publishing rules

Future subject channels must start with a similar root context file.

### Topic Queue and Published State

These files are required:

- content/topic-queue.json
- content/published.json
- output/state/selected-topics.json

The topic system works when selected topics are checked against published/completed topics before generation.

### Duplicate Topic Guard

Command:

npm run check:topics

Verified result:

- topic queue count: 12
- completed topic count: 0
- selected topic count: 2
- duplicate/topic reuse check passed

This must run before script generation, audio generation, image generation, video rendering, or upload.

### AI Script Generation

AI script generation works, but long AI JSON can fail parsing.

Verified failure pattern:

- malformed JSON from AI response
- parser correctly refused bad output

Fix:

- add a JSON repair utility
- keep code responsible for validating JSON

### Narration Tightening

Narration tightening works better when the AI returns plain narration text only.

Bad pattern:

- ask AI to rewrite full JSON

Good pattern:

- ask AI to rewrite only narration
- code inserts narration into existing JSON

Reason:

- AI is good at prose
- code is better at structure and state

### Story Audit Gate

Command:

npm run audit:story

Verified result:

- The Forgotten God Beneath the Mountain story audit passed
- The City That Erased Its Own Name story audit passed
- pass count: 2 of 2

Story audit checks:

- beginning
- middle
- summary / tie-together
- ending
- focus
- completeness
- IP safety

No visuals should be generated before story audit passes.

### Production Readiness Gate

Command:

npm run audit:production

Verified result:

- both selected topics stayed blocked_review
- publish-ready count: 0

This is correct behavior.

Production should stay blocked until:

- story audit passes
- audio exists
- quota is not blocking required output
- visuals/video pass later checks
- human review approves upload

### ElevenLabs Voice Listing and Test Audio

Voice listing worked.

Selected test voice:

George - Warm, Captivating Storyteller
Voice ID: JBFqnCBsd6RMkjVDRZzb

Test audio worked and created a non-empty MP3.

Rule:

Always test a small audio sample before generating full narration.

### Full ElevenLabs Audio

First full narration worked.

Verified available file:

output/audio/forgotten-god-under-mountain/narration.mp3

Verified byte count:

6816122

Second narration was blocked by ElevenLabs quota.

Known blocked topic:

city-that-erased-its-own-name

Reason:

quota_exceeded

Rule:

Quota failure is not a code failure. It is a pipeline state that must be logged and handled.

### Idempotent Audio Generation

The quota-aware audio generator works.

It skips already-generated MP3s instead of spending more credits.

Rule:

Never regenerate existing paid audio unless the file is deleted or intentionally invalidated.

### Modular Code Rule

The 150-line rule caught oversized files.

Files that had to be split:

- tighten-script-drafts.mjs
- generate-elevenlabs-narration-audio.mjs
- audit-story-structure.mjs

Working pattern:

- command script stays thin
- reusable logic goes into scripts/lib

## What Did Not Work

### Do Not Trust Long AI JSON

Long AI-generated JSON can break.

Use repair scripts and validation.

### Do Not Make AI Own State

AI should not own:

- JSON schema
- topic state
- published state
- production manifests
- duplicate tracking

Code owns those.

### Do Not Treat Near-Target Word Count as Failure

A script slightly over preferred word count can still be usable.

Use:

- target word count
- preferred max
- acceptable max

Do not block the pipeline over a small near-pass unless quality actually suffers.

### Do Not Regenerate Paid Assets Blindly

Rerunning paid generation without skip checks wastes credits.

Every paid generation step must check for existing output first.

### Do Not Upload Automatically Yet

Human review remains required.

Production manifest must remain publish_ready false until human approval is intentionally recorded.

## Current Verified Status

As of the latest verified checkpoint:

- validate:state passed
- check:topics passed
- audit:story passed for both selected topics
- audit:production passed but kept both topics blocked_review
- audio exists for forgotten-god-under-mountain
- city-that-erased-its-own-name is blocked by ElevenLabs quota
- story audit modules are under 150 lines
- latest story audit split was committed and pushed
- working tree ended clean

## Future Subject Reuse Checklist

For a new subject, repeat this setup:

1. Create a clean local folder.
2. Create .gitignore before adding keys.
3. Create PROJECT_CONTEXT.md first.
4. Create content/topic-queue.json.
5. Create content/published.json.
6. Add duplicate guard.
7. Add AI script generation.
8. Add JSON validation/repair.
9. Add narration tightening.
10. Add story audit.
11. Add voice package generation.
12. Add test voice generation.
13. Add idempotent full audio generation.
14. Add production readiness gate.
15. Keep docs updated every time a failure teaches a reusable rule.

## Rule for Future Updates

Whenever something works, fails, or teaches a repeatable rule, update this file and push it to GitHub before moving too far ahead.

## New Verified Lesson: Scene Alignment Must Be Audited

Story audit can pass while scene metadata still contains a visual/narration mismatch.

Verified issue:

- Forgotten God Scene 6 referenced Descent Progression content.
- The actual narration did not include that content.
- Changing narration would invalidate already-generated voice audio.
- Correct fix was to repair scene metadata/prompts to match the existing narration.

Rule:

Run scene alignment audit before image generation or video rendering.

Do not generate visuals from scene prompts until scene summaries match the actual narration.

## New Verified Rule: Image Prompts Require All Gates

Image prompt packages should not be created just because scenes exist.

Required gates before image prompt packaging:

- story audit passed
- scene alignment audit passed
- usable narration audio exists

If audio is quota-blocked, skip visual work for that topic until audio is available.

## New Verified Lesson: Creator Plan Unblocked Second Narration

After upgrading ElevenLabs to Creator, the second narration generated successfully.

Verified behavior:

- Forgotten God audio already existed and was skipped.
- City audio generated successfully.
- Audio available count became 2.
- Audio quota-blocked count became 0.

Rule:

The idempotent audio generator works. It should remain mandatory before any paid voice generation so existing MP3 files are not regenerated accidentally.

## New Verified Lesson: Image Prompt Packages Must Be Audited for Blank Fields

A package can exist while every scene prompt is blank.

Verified issue:

- image-prompt-package.json existed
- thumbnail_prompt was blank
- scene titles were Untitled scene
- narration summaries were blank
- image prompts were blank

Rule:

Run audit:image-prompts after generate:image-prompts and before any paid image generation.
Blank thumbnail, blank scene summaries, or blank image prompts are hard failures.

## New Verified Rule: Length Is Guidance, Story Quality Is the Gate

A rigid exact word count is the wrong production target for Ember & Stone.

The stories should feel natural, complete, focused, and viral. A couple minutes in either direction is acceptable if the story is stronger.

Rule:

- Do not force every story into the same exact length.
- Do not cut strong story moments just to hit an arbitrary word count.
- Use target ranges for cost and planning.
- Use story quality, focus, structure, pacing, IP safety, scene alignment, and human review as hard gates.
- Length should trigger review only when it causes dragging, repetition, rushed pacing, or incomplete payoff.

## New Verified Rule: Remove Readable Text From Image Prompts

Image prompts should not ask models to create readable words, letters, titles, carved words, or visible written phrases.

Reason:

Image models often generate ugly fake text or unreadable letter artifacts.

Rule:

Use symbols, blank pages, illegible marks, seals, stains, smears, or geometric carvings instead of readable words.

## New Verified Rule: Reuse Approved Sample Images Before Full Final Batch

If the sample images are approved by human review, reuse them as final assets instead of regenerating them.

Rule:

- Copy approved sample images into the final output set.
- Generate only the missing remaining final images.
- Keep final image generation idempotent so reruns do not waste credits.

## New Verified Rule: Human Visual Review Is a Hard Gate

Final images must not be approved just because they exist.

A dark fantasy lore image must pass all of these checks:

- It looks amazing enough for a serious lore channel.
- It has a strong focal point.
- It matches the exact script beat.
- It is not merely generic dark fantasy mood.
- It avoids readable text, fake letters, watermarks, logos, and protected IP drift.
- It supports thumbnail/retention quality.
- It can be rejected and regenerated without rerunning the whole batch.

Verified issue:

Some generated images looked good stylistically but failed the script beat. The correct workflow was to move only weak images to rejected output, strengthen those prompts, and regenerate only the missing finals.

Rule:

Use sample image review first. Then after final batch generation, perform human visual beat-match review. Regenerate only failed images until every final image is approved.

## New Verified Rule: Beat-Locked Prompt Fields Are Required

Loose visual prompts can create beautiful images that miss the exact script beat.

Rule:

Every scene and thumbnail must include beat_lock fields before image generation:

- primary_subject
- primary_action
- required_elements
- forbidden_drift
- environment
- background_element
- framing
- mood

The final image generator should compile from beat_lock when present.

## New Verified Rule: Quality Gates Beat File-Length Warnings

File length warnings should not block production work when the code is safe, tested, and the issue is mostly static configuration data.

Rule:

- Hard blockers: failing syntax checks, failing unit tests, failed audits, broken state, bad images, script drift, IP risk, missing assets.
- Soft warnings: a config-heavy script being longer than preferred.
- Split long files later when maintainability is the actual problem, not while trying to preserve creative momentum.

## New Verified Rule: Channel-Wide Visual Canon Is Required

Ember & Stone is a long-running channel, not a one-off video project.

Rule:

Every image must satisfy both:

- It clearly communicates the intended script beat.
- It visually belongs to the permanent Ember & Stone channel identity.

The channel style bible and machine-readable channel-style.json are source-of-truth files. Future image prompts should inherit the channel consistency lock before episode-specific and scene-specific instructions.

## New Verified Rule: Image Model Policy Is Required

Ember & Stone should not blindly use one image model for every scene type.

Verified observations:

- SDXL 1.0 works well for atmospheric dark fantasy scenes.
- SDXL 1.0 struggled with hard action constraints such as hand drawing, exact subject counts, and no-horse instructions.
- FLUX.1 Kontext was tested on scene 7 and did not pass.
- Phoenix 1.0 was tested on scene 7 and produced better action clarity, but still needs style consistency review before automatic use.

Rule:

Use a documented image model policy. High-risk scenes require small one-image tests before full regeneration. Do not repeatedly spend credits on the same failed prompt/model combination without changing strategy.
