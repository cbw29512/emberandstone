#!/usr/bin/env node
import fs from 'fs';
import { execSync } from 'child_process';

const script = JSON.parse(fs.readFileSync('./content/current-script.json', 'utf8'));

const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.YOUTUBE_REFRESH_TOKEN;

// Get fresh access token
async function getAccessToken() {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
      grant_type: 'refresh_token'
    })
  });

  const data = await response.json();
  if (!data.access_token) throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

// Schedule publish for next Wednesday at 3pm UTC (peak D&D audience time)
function getScheduledPublishTime() {
  const now = new Date();
  const daysUntilWed = (3 - now.getUTCDay() + 7) % 7 || 7;
  const publishDate = new Date(now);
  publishDate.setUTCDate(now.getUTCDate() + daysUntilWed);
  publishDate.setUTCHours(15, 0, 0, 0);
  return publishDate.toISOString();
}

async function uploadVideo(accessToken) {
  const videoFile = fs.readFileSync('./content/final-video.mp4');
  const fileSize = videoFile.length;
  const scheduledTime = getScheduledPublishTime();

  const metadata = {
    snippet: {
      title: script.title,
      description: script.description,
      tags: script.tags,
      categoryId: '27', // Education
      defaultLanguage: 'en',
      defaultAudioLanguage: 'en'
    },
    status: {
      privacyStatus: 'private',
      publishAt: scheduledTime,
      selfDeclaredMadeForKids: false,
      containsSyntheticMedia: true  // Required for AI content disclosure
    }
  };

  // Step 1: Initiate resumable upload
  const initResponse = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': 'video/mp4',
        'X-Upload-Content-Length': fileSize
      },
      body: JSON.stringify(metadata)
    }
  );

  if (!initResponse.ok) {
    throw new Error(`Upload init failed: ${await initResponse.text()}`);
  }

  const uploadUrl = initResponse.headers.get('Location');
  console.log(`Upload URL obtained. Uploading ${Math.round(fileSize / 1024 / 1024)}MB...`);

  // Step 2: Upload video bytes
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': fileSize
    },
    body: videoFile
  });

  if (!uploadResponse.ok) {
    throw new Error(`Video upload failed: ${await uploadResponse.text()}`);
  }

  const videoData = await uploadResponse.json();
  const videoId = videoData.id;
  console.log(`Video uploaded: https://youtube.com/watch?v=${videoId}`);
  console.log(`Scheduled for: ${scheduledTime}`);

  return videoId;
}

async function uploadThumbnail(accessToken, videoId) {
  const thumbnail = fs.readFileSync('./content/thumbnail.jpg');

  const response = await fetch(
    `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}&uploadType=media`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'image/jpeg',
        'Content-Length': thumbnail.length
      },
      body: thumbnail
    }
  );

  if (!response.ok) {
    console.warn(`Thumbnail upload failed: ${await response.text()}`);
  } else {
    console.log('Thumbnail uploaded.');
  }
}

async function main() {
  console.log('Authenticating with YouTube...');
  const accessToken = await getAccessToken();

  const videoId = await uploadVideo(accessToken);
  await uploadThumbnail(accessToken, videoId);

  // Mark topic as published
  const queuePath = './content/topic-queue.json';
  const queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
  const topic = queue.find(t => t.id === script.topic_id);
  if (topic) topic.status = 'published';
  fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2));

  // Log to published.json
  const publishedPath = './content/published.json';
  const published = JSON.parse(fs.readFileSync(publishedPath, 'utf8'));
  published.push({
    topic_id: script.topic_id,
    title: script.title,
    video_id: videoId,
    youtube_url: `https://youtube.com/watch?v=${videoId}`,
    published_at: new Date().toISOString()
  });
  fs.writeFileSync(publishedPath, JSON.stringify(published, null, 2));

  // Clean up temp files
  fs.rmSync('./content/images', { recursive: true, force: true });
  fs.rmSync('./content/narration.mp3', { force: true });
  fs.rmSync('./content/video-silent.mp4', { force: true });
  fs.rmSync('./content/final-video.mp4', { force: true });
  fs.rmSync('./content/thumbnail.jpg', { force: true });
  fs.rmSync('./content/current-script.json', { force: true });
  fs.rmSync('./content/concat.txt', { force: true });
  fs.rmSync('./content/clips-concat.txt', { force: true });

  console.log(`\n✅ Pipeline complete: "${script.title}"`);
  console.log(`   YouTube: https://youtube.com/watch?v=${videoId}`);
}

main().catch(err => {
  console.error('Upload failed:', err);
  process.exit(1);
});
