#!/usr/bin/env node
import fs from 'fs';

const LEONARDO_API_KEY = process.env.LEONARDO_API_KEY;

// Leonardo Phoenix 1.0 - best for dark fantasy art style
const MODEL_ID = 'de7d3faf-762f-48e0-b3b7-9d0ac3a3fcf3';

const BASE_STYLE_SUFFIX = `
Dark fantasy oil painting style. Dramatic chiaroscuro lighting. 
Cinematic composition. Rich deep colors — blacks, crimsons, golds, deep purples. 
No text. No UI elements. Highly detailed. Epic scale. 
Style of classic fantasy illustration meets baroque painting.
`;

const script = JSON.parse(fs.readFileSync('./content/current-script.json', 'utf8'));

// Create images directory for this run
fs.mkdirSync('./content/images', { recursive: true });

async function generateImage(scene, index) {
  const prompt = `${scene.image_prompt}. ${BASE_STYLE_SUFFIX}`;

  console.log(`Generating image ${index + 1}/${script.scenes.length}: ${scene.scene_name}`);

  // Submit generation job
  const initResponse = await fetch('https://cloud.leonardo.ai/api/rest/v1/generations', {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${LEONARDO_API_KEY}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      modelId: MODEL_ID,
      prompt,
      negative_prompt: 'text, watermark, signature, blurry, low quality, cartoon, anime, 3d render, photorealistic, modern, sci-fi',
      width: 1920,
      height: 1080,
      num_images: 1,
      guidance_scale: 7,
      num_inference_steps: 30,
      public: false
    })
  });

  if (!initResponse.ok) {
    throw new Error(`Leonardo init error: ${await initResponse.text()}`);
  }

  const { sdGenerationJob } = await initResponse.json();
  const generationId = sdGenerationJob.generationId;

  // Poll until complete
  let imageUrl = null;
  for (let attempt = 0; attempt < 30; attempt++) {
    await new Promise(r => setTimeout(r, 3000));

    const pollResponse = await fetch(
      `https://cloud.leonardo.ai/api/rest/v1/generations/${generationId}`,
      { headers: { 'authorization': `Bearer ${LEONARDO_API_KEY}` } }
    );

    const pollData = await pollResponse.json();
    const gen = pollData.generations_by_pk;

    if (gen?.status === 'COMPLETE' && gen.generated_images?.length > 0) {
      imageUrl = gen.generated_images[0].url;
      break;
    }

    if (gen?.status === 'FAILED') {
      throw new Error(`Image generation failed for scene: ${scene.scene_name}`);
    }
  }

  if (!imageUrl) throw new Error(`Timeout waiting for image: ${scene.scene_name}`);

  // Download image
  const imgResponse = await fetch(imageUrl);
  const imgBuffer = await imgResponse.arrayBuffer();
  const filename = `./content/images/scene_${String(index + 1).padStart(2, '0')}.png`;
  fs.writeFileSync(filename, Buffer.from(imgBuffer));
  console.log(`  ✓ Saved: ${filename}`);

  return filename;
}

// Generate sequentially to avoid rate limits
const imagePaths = [];
for (let i = 0; i < script.scenes.length; i++) {
  const path = await generateImage(script.scenes[i], i);
  imagePaths.push(path);
  // Small delay between generations
  if (i < script.scenes.length - 1) await new Promise(r => setTimeout(r, 2000));
}

script.image_paths = imagePaths;
fs.writeFileSync('./content/current-script.json', JSON.stringify(script, null, 2));
console.log(`All ${imagePaths.length} images generated.`);
