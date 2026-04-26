#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Pick next pending topic
const queuePath = './content/topic-queue.json';
const queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
const topic = queue.find(t => t.status === 'pending');

if (!topic) {
  console.error('No pending topics in queue. Add more to content/topic-queue.json');
  process.exit(1);
}

console.log(`Generating script for: ${topic.title}`);

const systemPrompt = `You are a master scriptwriter for a dark fantasy YouTube lore channel called "Ember & Stone". 
Your videos are cinematic, narrative-driven deep dives into D&D lore. 
Think: documentary tone meets campfire storytelling. Deep, gravitas-filled, slightly ominous.
You write for a NARRATOR — no second person "you", no "in this video", no meta-commentary.
Every sentence should pull the listener deeper. Use vivid imagery. Build dread slowly.
The narrator's voice is like a historian who has seen too much.`;

const userPrompt = `Write a complete YouTube lore video script about: ${topic.subject}

Hook concept: ${topic.hook}
Tone: ${topic.tone}

REQUIREMENTS:
- Total length: 1800-2200 words (targets ~12-14 minutes of narration)
- Start with a HOOK that grabs in the first 15 seconds — no slow intros
- Build through 6-8 distinct narrative SCENES
- Each scene should have a clear emotional beat (dread, revelation, tragedy, awe)
- End with a haunting closing line that lingers

OUTPUT FORMAT (strict JSON):
{
  "title": "YouTube video title — punchy, curiosity-driven, max 60 chars",
  "description": "YouTube description — 150 words, includes relevant keywords naturally",
  "tags": ["tag1", "tag2", ...],  // 15 relevant tags
  "scenes": [
    {
      "scene_number": 1,
      "scene_name": "short name for this scene",
      "narration": "full narration text for this scene",
      "image_prompt": "detailed visual prompt for AI image generation — dark fantasy oil painting style, dramatic lighting, no text, cinematic composition. Describe exactly what should be in the image.",
      "duration_seconds": 90
    }
  ]
}

Return ONLY valid JSON. No markdown. No explanation.`;

const response = await client.messages.create({
  model: 'claude-opus-4-5',
  max_tokens: 4096,
  messages: [{ role: 'user', content: userPrompt }],
  system: systemPrompt
});

const rawContent = response.content[0].text.trim();

let script;
try {
  script = JSON.parse(rawContent);
} catch (e) {
  // Strip any accidental markdown fences
  const cleaned = rawContent.replace(/^```json\n?/, '').replace(/\n?```$/, '');
  script = JSON.parse(cleaned);
}

// Attach metadata
script.topic_id = topic.id;
script.generated_at = new Date().toISOString();

// Save script
fs.writeFileSync('./content/current-script.json', JSON.stringify(script, null, 2));
console.log(`Script generated: "${script.title}" — ${script.scenes.length} scenes`);

// Mark topic as in-progress
topic.status = 'in-progress';
fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2));
