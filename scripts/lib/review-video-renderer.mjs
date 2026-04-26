// scripts/lib/review-video-renderer.mjs
// Purpose: Render local MP4 review videos from final images and narration audio.

import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { readVideoRenderPolicy } from "./video-render-policy.mjs";

function logInfo(message) {
  console.log("[INFO] " + message);
}

function fail(message) {
  throw new Error(message);
}

function run(command, args, label) {
  const result = spawnSync(command, args, { encoding: "utf8", shell: false });

  if (result.error) {
    fail(label + " failed to start: " + result.error.message);
  }

  return {
    ok: result.status === 0,
    stdout: String(result.stdout || "").trim(),
    stderr: String(result.stderr || "").trim()
  };
}

function runRequired(command, args, label) {
  const result = run(command, args, label);

  if (!result.ok) {
    fail(label + " failed: " + result.stderr);
  }

  return result.stdout;
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

function encoderList() {
  return runRequired("ffmpeg", ["-hide_banner", "-encoders"], "ffmpeg encoder list");
}

function hasEncoder(encoders, name) {
  return new RegExp("\\b" + name + "\\b").test(encoders);
}

function availableProfiles() {
  const encoders = encoderList();

  const profiles = [
    { name: "libx264", args: ["-c:v", "libx264", "-preset", "medium"] },
    { name: "h264_mf", args: ["-c:v", "h264_mf"] },
    { name: "h264_nvenc", args: ["-c:v", "h264_nvenc"] },
    { name: "h264_qsv", args: ["-c:v", "h264_qsv"] },
    { name: "h264_amf", args: ["-c:v", "h264_amf"] },
    { name: "mpeg4", args: ["-c:v", "mpeg4", "-q:v", "3"] }
  ];

  return profiles.filter((profile) => hasEncoder(encoders, profile.name));
}

function getAudioDuration(audioFile) {
  const output = runRequired("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    audioFile
  ], "ffprobe audio duration");

  const duration = Number(output);

  if (!Number.isFinite(duration) || duration <= 0) {
    fail("Invalid audio duration: " + audioFile);
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

function buildRenderSequence(sceneImages, duration, policy) {
  const slotCount = Math.max(sceneImages.length, Math.ceil(duration / policy.target_seconds_per_image));

  if (!policy.repeat_images_to_fill_audio && slotCount > sceneImages.length) {
    fail("Not enough images to satisfy cadence without repeats.");
  }

  const sequence = [];

  for (let index = 0; index < slotCount; index += 1) {
    sequence.push(sceneImages[index % sceneImages.length]);
  }

  const secondsPerSlot = duration / slotCount;

  if (secondsPerSlot < policy.minimum_seconds_per_image) {
    fail("Calculated seconds_per_slot fell below minimum_seconds_per_image.");
  }

  if (secondsPerSlot > policy.maximum_seconds_per_image) {
    fail("Calculated seconds_per_slot exceeded maximum_seconds_per_image.");
  }

  return {
    renderSequence: sequence,
    slotCount,
    secondsPerSlot
  };
}

async function writeConcatFile(concatFile, renderSequence, secondsPerSlot) {
  const lines = [];

  for (const image of renderSequence) {
    lines.push("file '" + ffPath(image) + "'");
    lines.push("duration " + secondsPerSlot.toFixed(3));
  }

  lines.push("file '" + ffPath(renderSequence[renderSequence.length - 1]) + "'");
  await fs.writeFile(concatFile, lines.join("\n"));
}

function renderWithFfmpeg(concatFile, audioFile, outputVideo, topicId) {
  const profiles = availableProfiles();

  if (profiles.length === 0) {
    fail("No usable FFmpeg video encoders found.");
  }

  let lastError = "";

  for (const profile of profiles) {
    logInfo("Trying video encoder for " + topicId + ": " + profile.name);

    const args = [
      "-y",
      "-f", "concat",
      "-safe", "0",
      "-i", concatFile,
      "-i", audioFile,
      "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p",
      "-r", "30",
      ...profile.args,
      "-c:a", "aac",
      "-b:a", "192k",
      "-shortest",
      outputVideo
    ];

    const result = run("ffmpeg", args, "ffmpeg render " + topicId + " with " + profile.name);

    if (result.ok) {
      logInfo("Rendered " + topicId + " with encoder: " + profile.name);
      return profile.name;
    }

    lastError = result.stderr;
    logInfo("Encoder failed for " + topicId + ": " + profile.name);
  }

  fail("All FFmpeg encoder attempts failed for " + topicId + ". Last error: " + lastError);
}

async function renderTopic(rootDir, topicId, policy) {
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
  const build = buildRenderSequence(sceneImages, duration, policy);

  await fs.mkdir(outputDir, { recursive: true });
  await writeConcatFile(concatFile, build.renderSequence, build.secondsPerSlot);

  const encoder = renderWithFfmpeg(concatFile, audioFile, outputVideo, topicId);

  const manifest = {
    topic_id: topicId,
    status: "rendered_for_human_review",
    audio_file: audioFile,
    source_scene_images: sceneImages,
    source_scene_count: sceneImages.length,
    render_sequence_images: build.renderSequence,
    render_slot_count: build.slotCount,
    target_seconds_per_image: policy.target_seconds_per_image,
    seconds_per_slot: build.secondsPerSlot,
    duration_seconds: duration,
    video_encoder: encoder,
    output_video: outputVideo,
    created_at: new Date().toISOString()
  };

  await fs.writeFile(manifestFile, JSON.stringify(manifest, null, 2));
  return manifest;
}

export async function renderReviewVideos(rootDir) {
  const topicIds = await getTopicIds(rootDir);
  const policy = await readVideoRenderPolicy(rootDir);
  const rendered = [];

  for (const topicId of topicIds) {
    rendered.push(await renderTopic(rootDir, topicId, policy));
  }

  return rendered;
}