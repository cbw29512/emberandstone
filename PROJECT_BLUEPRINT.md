# Ember & Stone — Automated Faceless Lore Channel

## Confirmed Local Folder

C:\Users\divcl\OneDrive\Desktop\EmberAndStone

## Objective

Build a faceless, automated dark fantasy / D&D-style lore video pipeline.

The pipeline should eventually:
1. Select a topic from a queue.
2. Generate a script.
3. Generate narration.
4. Generate scene images.
5. Render a video.
6. Upload to YouTube.
7. Track what was published.
8. Avoid duplicates.
9. Never commit API keys.

## Definition of Done

The project is complete when:

- GitHub repo exists and points to this clean folder.
- APIKeys.txt is ignored and never committed.
- Topic queue has at least 12 approved topics.
- One local test video renders successfully.
- One video uploads successfully to the new YouTube channel.
- GitHub Actions can run the pipeline on a schedule.
- Every run is logged.
- Duplicate topics are skipped.

## Data Schema

### topic-queue.json

Each topic must follow this shape:

{
  "id": "unique-topic-id",
  "title": "Video topic title",
  "status": "queued",
  "priority": 1,
  "video_type": "longform",
  "risk_level": "safe",
  "source_notes": [],
  "created_at": "2026-04-26T00:00:00Z"
}

### published.json

Each published item must follow this shape:

{
  "topic_id": "unique-topic-id",
  "youtube_video_id": null,
  "title": null,
  "status": "drafted | rendered | uploaded | failed",
  "created_at": null,
  "published_at": null,
  "error": null
}

## State Logic

queued -> scripted -> voiced -> imaged -> rendered -> uploaded -> published

If any step fails:
- stop the run,
- log the error,
- do not overwrite working files,
- do not mark the topic as published.

## Code Rule

Any file over 150 lines must be split into smaller modules.
