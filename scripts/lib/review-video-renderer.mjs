// scripts/lib/review-video-renderer.mjs
import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

function logInfo(message) {
  console.log("[INFO] " + message);
}

function fail(message) {
  throw new Error(message);
}

function run(command, args, label) {
  const result = spawnSync(command, args, { encoding: "utf8", shell: false });

  if (result.error) fail(label + " failed to start: " + result.error.message);
  if (result.status !== 0) fail(label + " failed: " + result.stderr);

  return String(result.stdout || "").trim();
}

function ffPath(filePath) {
  return filePath.replaceAll("\\", "/").replaceAll("'", "'\\''");
}

function sceneNumber(fileName) {
  const match = fileName.match(/^scene-(\d+)\.jpg$/);
  return match ? Number(match[1]) : 999;
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function getTopicIds(rootDir) {
  const audioRoot = path.join(rootDir, "output", "audio");

  if (!(await pathExists(audioRoot))) {
    fail("Missing audio folder: " + audioRoot);
  }

  const entries = await fs.readdir(audioRoot, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

function getAudioDuration(audioFile) {
  const output = run("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    audioFile
  ], "ffprobe audio duration");

  const duration = Number(output);

  if (!Number.isFinite(duration) || duration <= 0) {
    fail("Invalid audio duration for: " + audioFile);
  }

  return duration;
}

async function getSceneImages(finalImageDir) {
  const files = await fs.readdir(finalImageDir);
  return files
    .filter((file) => /^scene-\d+\.jpg$/.test(file))
    .sort((a, b) => sceneNumber(a) - sceneNumber(b))
    .map((file) => path.join(finalImageDir, file));
}

async function writeConcatFile(concatFile, sceneImages, secondsPerScene) {
  const lines = [];

  for (const image of sceneImages) {
    lines.push("file '" + ffPath(image) + "'");
    lines.push("duration " + secondsPerScene.toFixed(3));
  }

  lines.push("file '" + ffPath(sceneImages[sceneImages.length - 1]) + "'");
  await fs.writeFile(concatFile, lines.join("\n"));
}

function renderWithFfmpeg(concatFile, audioFile, outputVideo, topicId) {
  run("ffmpeg", [
    "-y",
    "-f", "concat",
    "-safe", "0",
    "-i", concatFile,
    "-i", audioFile,
    "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p",
    "-r", "30",
    "-c:v", "libx264",
    "-preset", "medium",
    "-c:a", "aac",
    "-b:a", "192k",
    "-shortest",
    outputVideo
  ], "ffmpeg render " + topicId);
}

async function renderTopic(rootDir, topicId) {
  const audioFile = path.join(rootDir, "output", "audio", topicId, "narration.mp3");
  const finalImageDir = path.join(rootDir, "output", "images", "final", topicId);
  const outputDir = path.join(rootDir, "output", "videos", "review", topicId);
  const concatFile = path.join(outputDir, "image-concat.txt");
  const manifestFile = path.join(outputDir, "render-manifest.json");
  const outputVideo = path.join(outputDir, topicId + ".mp4");

  if (!(await pathExists(audioFile))) fail("Missing narration audio: " + audioFile);
  if (!(await pathExists(finalImageDir))) fail("Missing final image dir: " + finalImageDir);

  const sceneImages = await getSceneImages(finalImageDir);
  if (sceneImages.length === 0) fail("No scene images found for: " + topicId);

  const duration = getAudioDuration(audioFile);
  const secondsPerScene = duration / sceneImages.length;

  await fs.mkdir(outputDir, { recursive: true });
  await writeConcatFile(concatFile, sceneImages, secondsPerScene);

  logInfo("Rendering review video for " + topicId);
  renderWithFfmpeg(concatFile, audioFile, outputVideo, topicId);

  const manifest = {
    topic_id: topicId,
    status: "rendered_for_human_review",
    audio_file: audioFile,
    scene_images: sceneImages,
    scene_count: sceneImages.length,
    duration_seconds: duration,
    seconds_per_scene: secondsPerScene,
    output_video: outputVideo,
    created_at: new Date().toISOString()
  };

  await fs.writeFile(manifestFile, JSON.stringify(manifest, null, 2));
  return manifest;
}

export async function renderReviewVideos(rootDir) {
  const topicIds = await getTopicIds(rootDir);
  const rendered = [];

  for (const topicId of topicIds) {
    rendered.push(await renderTopic(rootDir, topicId));
  }

  return rendered;
}
