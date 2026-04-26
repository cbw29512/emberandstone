// scripts/render-review-videos.mjs
import { renderReviewVideos } from "./lib/review-video-renderer.mjs";

async function main() {
  try {
    const rendered = await renderReviewVideos(process.cwd());

    console.log("[INFO] Rendered review video count: " + rendered.length);

    for (const item of rendered) {
      console.log("[INFO] " + item.topic_id + ": " + item.output_video);
    }
  } catch (error) {
    console.error("[ERROR] " + error.message);
    process.exitCode = 1;
  }
}

await main();
