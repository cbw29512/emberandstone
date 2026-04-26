# Ember & Stone — Automated D&D Lore Pipeline

Fully automated YouTube pipeline. GitHub Actions fires weekly, Claude writes the script, ElevenLabs narrates it, Leonardo generates the visuals, FFmpeg renders the video, YouTube API uploads it. Zero manual steps after setup.

## Pipeline Flow

```
Sunday 2am UTC: Cron fires
→ Claude API writes lore script + image prompts
→ ElevenLabs "James" voice narrates the script
→ Leonardo AI generates dark fantasy scene images
→ FFmpeg renders Ken Burns video with music bed
→ ImageMagick generates thumbnail
→ YouTube API uploads + schedules for Wednesday 3pm UTC
```

## Setup

### 1. Clone & install
```bash
git clone https://github.com/YOUR_USERNAME/ember-and-stone.git
cd ember-and-stone
npm install
```

### 2. Get your API keys

| Service | Where to get it | Cost |
|---------|----------------|------|
| Anthropic | platform.anthropic.com | ~$5-10/mo |
| ElevenLabs | elevenlabs.io (Creator plan) | $22/mo |
| Leonardo | leonardo.ai (API Basic) | $9/mo |
| YouTube | console.cloud.google.com | Free |

### 3. Set GitHub Secrets

In your GitHub repo → Settings → Secrets and variables → Actions:

```
ANTHROPIC_API_KEY
ELEVENLABS_API_KEY
LEONARDO_API_KEY
YOUTUBE_CLIENT_ID
YOUTUBE_CLIENT_SECRET
YOUTUBE_REFRESH_TOKEN
```

### 4. Get YouTube OAuth credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → Enable YouTube Data API v3
3. Create OAuth 2.0 credentials (Desktop app type)
4. Download the credentials JSON
5. Run the one-time auth flow to get your refresh token:

```bash
# Install the Google auth helper
npm install -g google-auth-library

# Run this locally to get your refresh token
node -e "
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, 'urn:ietf:wg:oauth:2.0:oob');
const url = client.generateAuthUrl({ access_type: 'offline', scope: ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube'] });
console.log('Visit:', url);
"
# Visit the URL, approve, paste the code back, get your refresh token
```

### 5. Add royalty-free music (optional but recommended)

Drop any royalty-free fantasy/ambient MP3 into `assets/music/`. 
Good free sources:
- [Free Music Archive](https://freemusicarchive.org) — filter by Fantasy/Ambient
- [Pixabay Music](https://pixabay.com/music/) — search "dark fantasy"
- [Incompetech](https://incompetech.com) — Kevin MacLeod, CC licensed

The pipeline automatically loops it at 8% volume under the narration.

### 6. Manage your topic queue

Edit `content/topic-queue.json` to add new topics. Format:
```json
{
  "id": "021",
  "title": "Your Video Concept",
  "subject": "Detailed description of what the video covers",
  "hook": "The single most interesting angle or fact",
  "tone": "dark, mysterious, epic, tragic, etc.",
  "status": "pending"
}
```

Topics fire in order. Pipeline marks each as `in-progress` then `published` automatically.

## Manual Run

To trigger the pipeline without waiting for the cron:
- GitHub → Actions → Generate & Upload Lore Video → Run workflow

Or run locally (for testing individual stages):
```bash
ANTHROPIC_API_KEY=xxx node scripts/generate-script.mjs
ELEVENLABS_API_KEY=xxx node scripts/generate-voice.mjs
LEONARDO_API_KEY=xxx node scripts/generate-images.mjs
node scripts/render-video.mjs
node scripts/generate-thumbnail.mjs
# Skip upload-youtube for local testing
```

## Voice Settings

Using ElevenLabs **"James"** voice — deep British narrator, optimized for lore/documentary content.
- Stability: 38% — prevents monotone on long narrations
- Similarity: 75% — clean delivery without artifacts  
- Style: 30% — cinematic drama without overdoing it
- Model: eleven_multilingual_v2

## Output Schedule

Pipeline runs Sunday night → video uploads as Private → auto-publishes Wednesday 3pm UTC.
That's peak engagement time for D&D/fantasy audiences (mid-week, afternoon US/EU crossover).

## Definition of Done

- [x] Pipeline runs end-to-end without manual intervention
- [ ] First video live on @emberstoneaudio
- [x] Topic queue has 20 topics (5 months of weekly content)
