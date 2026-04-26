#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const script = JSON.parse(fs.readFileSync('./content/current-script.json', 'utf8'));

const totalDuration = script.audio_duration_seconds;
const scenes = script.scenes;
const imagePaths = script.image_paths;
const numScenes = scenes.length;

// Calculate how long each image shows (distribute evenly)
const baseDuration = Math.floor(totalDuration / numScenes);
const remainder = totalDuration - (baseDuration * numScenes);

// Build FFmpeg filter complex for Ken Burns zoom/pan effect
function buildKenBurnsFilter(imageIndex, duration, totalImages) {
  // Alternate between zoom-in and slow pan for variety
  const effects = [
    // Zoom in slowly from center
    `zoompan=z='min(zoom+0.0008,1.3)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${Math.round(duration * 25)}:s=1920x1080:fps=25`,
    // Pan left to right
    `zoompan=z='1.2':x='if(gte(on\\,1)\\,min(x+1.2\\,(iw/zoom)-iw/zoom*0.8)\\,0)':y='ih/2-(ih/zoom/2)':d=${Math.round(duration * 25)}:s=1920x1080:fps=25`,
    // Zoom out from top-left
    `zoompan=z='if(eq(on\\,1)\\,1.3\\,max(zoom-0.0008\\,1.0))':x='iw/2-(iw/zoom/2)':y='ih/3-(ih/zoom/3)':d=${Math.round(duration * 25)}:s=1920x1080:fps=25`,
    // Slow pan right to left
    `zoompan=z='1.15':x='if(eq(on\\,1)\\,(iw/zoom)*0.8\\,max(x-1.0\\,0))':y='ih/2-(ih/zoom/2)':d=${Math.round(duration * 25)}:s=1920x1080:fps=25`,
  ];
  return effects[imageIndex % effects.length];
}

// Write concat file for images
const concatLines = [];
imagePaths.forEach((imgPath, i) => {
  const duration = baseDuration + (i === 0 ? remainder : 0);
  concatLines.push(`file '${path.resolve(imgPath)}'`);
  concatLines.push(`duration ${duration}`);
});
// FFmpeg concat needs last file repeated
concatLines.push(`file '${path.resolve(imagePaths[imagePaths.length - 1])}'`);
fs.writeFileSync('./content/concat.txt', concatLines.join('\n'));

// Build individual zoompan clips
console.log('Rendering scene clips with Ken Burns effect...');
const clipPaths = [];

imagePaths.forEach((imgPath, i) => {
  const duration = baseDuration + (i === 0 ? remainder : 0);
  const zoomFilter = buildKenBurnsFilter(i, duration, numScenes);
  const clipPath = `./content/images/clip_${String(i + 1).padStart(2, '0')}.mp4`;
  
  execSync(
    `ffmpeg -y -loop 1 -i "${imgPath}" -vf "${zoomFilter},scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1" -t ${duration} -c:v libx264 -pix_fmt yuv420p -r 25 "${clipPath}"`,
    { stdio: 'inherit' }
  );
  clipPaths.push(clipPath);
});

// Concat all clips
console.log('Concatenating clips...');
const clipConcat = clipPaths.map(p => `file '${path.resolve(p)}'`).join('\n');
fs.writeFileSync('./content/clips-concat.txt', clipConcat);

execSync(
  `ffmpeg -y -f concat -safe 0 -i ./content/clips-concat.txt -c copy ./content/video-silent.mp4`,
  { stdio: 'inherit' }
);

// Find music bed (use first mp3 in assets/music or skip)
const musicFiles = fs.existsSync('./assets/music') 
  ? fs.readdirSync('./assets/music').filter(f => f.endsWith('.mp3'))
  : [];

let finalCommand;

if (musicFiles.length > 0) {
  const musicPath = `./assets/music/${musicFiles[0]}`;
  console.log(`Adding music bed: ${musicPath}`);
  // Narration at 100%, music at 8% underneath
  finalCommand = `ffmpeg -y \
    -i ./content/video-silent.mp4 \
    -i ./content/narration.mp3 \
    -i "${musicPath}" \
    -filter_complex "[1:a]volume=1.0[narr];[2:a]volume=0.08,aloop=loop=-1:size=2e+09[music];[narr][music]amix=inputs=2:duration=first[aout]" \
    -map 0:v -map "[aout]" \
    -c:v copy -c:a aac -b:a 192k \
    -shortest \
    ./content/final-video.mp4`;
} else {
  console.log('No music bed found — using narration only');
  finalCommand = `ffmpeg -y \
    -i ./content/video-silent.mp4 \
    -i ./content/narration.mp3 \
    -c:v copy -c:a aac -b:a 192k \
    -shortest \
    ./content/final-video.mp4`;
}

execSync(finalCommand, { stdio: 'inherit' });

console.log('Video rendered: ./content/final-video.mp4');
