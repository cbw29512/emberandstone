#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';

const script = JSON.parse(fs.readFileSync('./content/current-script.json', 'utf8'));

// Use the most dramatic scene image — typically scene 3 or 4 hits peak dread
const thumbnailSourceIndex = Math.min(3, script.image_paths.length - 1);
const sourceImage = script.image_paths[thumbnailSourceIndex];

// Clean title for display — truncate if needed
const displayTitle = script.title.length > 40 
  ? script.title.substring(0, 37) + '...' 
  : script.title;

// Split title into two lines for better layout
const words = displayTitle.split(' ');
const midpoint = Math.ceil(words.length / 2);
const line1 = words.slice(0, midpoint).join(' ').toUpperCase();
const line2 = words.slice(midpoint).join(' ').toUpperCase();

console.log(`Generating thumbnail for: ${script.title}`);

// ImageMagick composite:
// 1. Darken the source image
// 2. Add crimson vignette from bottom
// 3. Add "EMBER & STONE" brand text top-left
// 4. Add main title bold center-bottom
const cmd = `convert "${sourceImage}" \
  -resize 1280x720^ -gravity Center -extent 1280x720 \
  \\( +clone -fill "rgba(0,0,0,0.45)" -draw "rectangle 0,0 1280,720" \\) -composite \
  \\( -size 1280x300 gradient:transparent-"rgba(80,0,0,0.85)" \\) -gravity South -composite \
  -font DejaVu-Sans-Bold -pointsize 22 \
  -fill "rgba(255,160,50,0.9)" \
  -gravity NorthWest -annotate +40+40 "EMBER & STONE" \
  -font DejaVu-Sans-Bold -pointsize 72 \
  -fill white \
  -stroke "rgba(0,0,0,0.8)" -strokewidth 4 \
  -gravity South -annotate +0+120 "${line1}" \
  -stroke "rgba(0,0,0,0.8)" -strokewidth 4 \
  -gravity South -annotate +0+40 "${line2}" \
  -quality 95 \
  ./content/thumbnail.jpg`;

execSync(cmd, { stdio: 'inherit' });

console.log('Thumbnail generated: ./content/thumbnail.jpg');
