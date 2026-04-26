# Ember & Stone — AI Project Context

## Purpose

Ember & Stone is an automated faceless dark fantasy lore video pipeline.

The project creates original cinematic lore videos for YouTube using:

1. original topic queue
2. AI-written scripts
3. tightened narration
4. AI voice narration
5. scene-supporting fantasy visuals
6. subtle motion video rendering
7. automated YouTube metadata and upload

## Core Rule

One topic becomes one video.

After a topic is used, it must never be reused again.

The system must always move forward to a new topic.

## Local Project Folder

C:\Users\divcl\OneDrive\Desktop\EmberAndStone

## GitHub Repo

https://github.com/cbw29512/emberandstone

## Channel Direction

Ember & Stone should feel like:

- forbidden history
- dark fantasy lore
- cursed places
- haunted kingdoms
- strange gods
- dangerous myths
- TTRPG-ready story inspiration

It should not feel like:

- generic AI slop
- a fake talking-head channel
- copied D&D lore
- rules explanation content
- recycled monster manual summaries
- low-effort mass-produced narration

## Visual Direction

Primary format:

- cinematic scene images
- slow pans
- slow zooms
- fog
- torchlight
- particles
- subtle parallax
- key phrase overlays

Avatar rule:

Use a lorekeeper avatar only for short intro/outro branding if needed.

Do not use a full-time talking avatar unless testing proves it improves retention.

## Content Safety Rules

Default to original Ember & Stone lore.

Allowed:

- original fantasy lore
- generic fantasy concepts
- cursed cities
- invented gods
- invented kingdoms
- invented dragons
- invented cults
- invented magical disasters
- general TTRPG inspiration

Use caution:

- SRD 5.1 / SRD 5.2 material may be used only if properly attributed under CC-BY-4.0.
- Do not copy SRD text unless the project explicitly needs it.
- Prefer original summaries and original worldbuilding.

Avoid completely:

- official D&D setting lore
- Forgotten Realms
- Greyhawk
- Eberron
- Planescape
- Ravenloft
- named official D&D characters
- official D&D monster identities outside safe SRD use
- copied sourcebook text
- official WotC art
- stat blocks copied into videos
- claims that Ember & Stone is official
- claims of affiliation with Wizards of the Coast

## Script Rules

Each script must:

1. open with a strong hook in the first 10 seconds
2. focus on one topic only
3. avoid slow setup
4. avoid filler
5. avoid repeating itself
6. feel cinematic and dangerous
7. end with a campaign-ready question or unresolved threat
8. stay between 850 and 1200 narration words before voice generation

## Publishing Cadence

Launch phase:

- create/post 2 initial videos

Daily phase:

- create/post 1 video per day after the launch videos

## YouTube Automation Goals

The pipeline should auto-populate as much as possible:

- title
- description
- tags
- thumbnail
- playlist assignment
- scheduled publish time
- visibility
- category
- pinned comment or first comment if supported

## State Files

content/topic-queue.json

Stores upcoming topics.

content/published.json

Stores completed/uploaded/published topics.

output/state/selected-topics.json

Generated run-state. Ignored by Git.

output/scripts/<topic-id>/script-draft.json

Generated AI script draft. Ignored by Git.

output/scripts/<topic-id>/script-draft-tightened.json

Generated tightened script draft. Ignored by Git.

output/voice/<topic-id>/narration.txt

Generated narration file for TTS. Ignored by Git.

## Duplicate Prevention

The pipeline must fail if:

- the same topic id appears twice in topic-queue.json
- the same normalized title appears twice in topic-queue.json
- a selected topic already exists in published.json
- a selected topic has already been uploaded or published
- the system attempts to regenerate a topic already marked complete

## Completion Rule

A topic is considered complete when published.json contains that topic id with status:

- uploaded
- published

Once complete, the topic must not be selected again.

## AI Instruction

Before generating scripts, voice, images, video, metadata, or upload instructions, the AI/pipeline must obey this file.

If a future instruction conflicts with this file, stop and ask for confirmation before changing the project direction.

## Production Quality Gate

Ember & Stone must never publish raw first-pass AI output.

Every video must pass production review before upload.

A video is not publish-ready unless all of these are true:

1. The story has a clear beginning, middle, summary/tie-together, and ending.
2. The story stays focused on one topic only.
3. The lore feels complete, not like disconnected atmosphere.
4. The ending gives a final danger, unresolved mystery, or campaign-ready hook.
5. The script avoids protected D&D setting lore, named official characters, official art, copied sourcebook text, and non-SRD drift.
6. The voice narration exists and is not an empty or broken file.
7. The final production manifest marks publish_ready as true.
8. Human review is still required before actual upload until this pipeline has proven consistent quality.

If any story audit fails, the pipeline must revise the script, regenerate tightened narration, and remake voice audio before moving to video rendering.

Cost is allowed when needed for quality. Do not choose cheap output over production-grade output.
