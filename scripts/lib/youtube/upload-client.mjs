// scripts/lib/youtube/upload-client.mjs
// Purpose: Send one private video upload to YouTube.

import fs from "node:fs/promises";
import { fail } from "./common.mjs";

export async function uploadVideoMultipart(accessToken, uploadPackage) {
  const videoBuffer = await fs.readFile(uploadPackage.video_file);
  const boundary = "emberstone-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  const metadata = buildMetadata(uploadPackage);
  const body = buildMultipartBody(boundary, metadata, videoBuffer);
  const url = "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: "Bearer " + accessToken,
      "content-type": "multipart/related; boundary=" + boundary,
      "content-length": String(body.length)
    },
    body
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    fail("YouTube upload failed for " + uploadPackage.topic_id + " with " + response.status + ": " + text);
  }

  if (!data.id) {
    fail("YouTube upload response missing video id for " + uploadPackage.topic_id + ".");
  }

  return data;
}

function buildMetadata(uploadPackage) {
  return {
    snippet: {
      title: uploadPackage.snippet.title,
      description: uploadPackage.snippet.description,
      tags: uploadPackage.snippet.tags || [],
      categoryId: uploadPackage.snippet.categoryId
    },
    status: {
      privacyStatus: "private",
      selfDeclaredMadeForKids: uploadPackage.status_payload.selfDeclaredMadeForKids === true
    }
  };
}

function buildMultipartBody(boundary, metadata, videoBuffer) {
  const metadataPart = Buffer.from(
    "--" + boundary + "\r\n" +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(metadata) + "\r\n"
  );

  const videoHeader = Buffer.from(
    "--" + boundary + "\r\n" +
    "Content-Type: video/mp4\r\n\r\n"
  );

  const closingBoundary = Buffer.from("\r\n--" + boundary + "--\r\n");

  return Buffer.concat([metadataPart, videoHeader, videoBuffer, closingBoundary]);
}