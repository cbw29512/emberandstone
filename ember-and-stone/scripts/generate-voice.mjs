#!/usr/bin/env node
import fs from 'fs';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// James - deep British narrator, best for lore/documentary content
const VOICE_ID = 'ZQe5CZNOzWyzPSCn5a3c';

const VOICE_SETTINGS = {
  stability: 0.38,           // Natural variation, prevents monotone
  similarity_boost: 0.75,    // Clean delivery without artifacts
  style: 0.30,               // Adds cinematic drama
  use_speaker_boost: true    // Fuller, more commanding sound
};

const script = JSON.parse(fs.readFileSync('./content/current-script.json', 'utf8'));

// Combine all scene narrations into one full script
const fullNarration = script.scenes
  .map(scene => scene.narration)
  .join('\n\n');

console.log(`Generating voiceover: ${fullNarration.length} characters`);

const response = await fetch(
  `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
  {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: fullNarration,
      model_id: 'eleven_multilingual_v2',
      voice_settings: VOICE_SETTINGS,
      output_format: 'mp3_44100_128'
    })
  }
);

if (!response.ok) {
  const err = await response.text();
  throw new Error(`ElevenLabs API error: ${response.status} — ${err}`);
}

const audioBuffer = await response.arrayBuffer();
fs.writeFileSync('./content/narration.mp3', Buffer.from(audioBuffer));

// Get audio duration via ffprobe for later use
import { execSync } from 'child_process';
const durationOutput = execSync(
  'ffprobe -i ./content/narration.mp3 -show_entries format=duration -v quiet -of csv=p=0'
).toString().trim();

const duration = parseFloat(durationOutput);
script.audio_duration_seconds = duration;
fs.writeFileSync('./content/current-script.json', JSON.stringify(script, null, 2));

console.log(`Voiceover generated: ${Math.round(duration / 60)}m ${Math.round(duration % 60)}s`);
