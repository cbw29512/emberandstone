// scripts/youtube-oauth-login.mjs
// Purpose: Create a local YouTube OAuth token for private review uploads.
// Why: YouTube uploads require user authorization; an API key is not enough.

import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";

const ROOT_DIR = process.cwd();
const SECRET_PATH = path.join(ROOT_DIR, "secrets", "youtube", "client_secret.json");
const TOKEN_PATH = path.join(ROOT_DIR, "secrets", "youtube", "token.json");
const SCOPE = "https://www.googleapis.com/auth/youtube.upload";
const HOST = "127.0.0.1";
const PORT = 53682;
const CALLBACK_PATH = "/oauth2callback";
const REDIRECT_URI = "http://" + HOST + ":" + PORT + CALLBACK_PATH;

function logInfo(message) {
  console.log("[INFO] " + message);
}

function fail(message) {
  throw new Error(message);
}

function stripBom(value) {
  return String(value || "").replace(/^\uFEFF/, "");
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(stripBom(raw));
}

function getInstalledClient(credentials) {
  const client = credentials.installed || credentials.web;

  if (!client) {
    fail("OAuth JSON does not contain installed or web client data.");
  }

  if (!client.client_id) {
    fail("OAuth JSON is missing client_id.");
  }

  if (!client.client_secret) {
    fail("OAuth JSON is missing client_secret.");
  }

  if (!client.auth_uri) {
    fail("OAuth JSON is missing auth_uri.");
  }

  if (!client.token_uri) {
    fail("OAuth JSON is missing token_uri.");
  }

  return client;
}

function openBrowser(url) {
  const command = process.platform === "win32"
    ? "cmd"
    : process.platform === "darwin"
      ? "open"
      : "xdg-open";

  const args = process.platform === "win32"
    ? ["/c", "start", "", url]
    : [url];

  const child = spawn(command, args, {
    detached: true,
    stdio: "ignore"
  });

  child.unref();
}

function buildAuthUrl(client, state) {
  const url = new URL(client.auth_uri);

  url.searchParams.set("client_id", client.client_id);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);

  return url.toString();
}

function waitForOAuthCallback(expectedState) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      try {
        const requestUrl = new URL(request.url, REDIRECT_URI);

        if (requestUrl.pathname !== CALLBACK_PATH) {
          response.writeHead(404);
          response.end("Not found.");
          return;
        }

        const error = requestUrl.searchParams.get("error");

        if (error) {
          response.writeHead(400, { "content-type": "text/plain" });
          response.end("OAuth failed. You may close this tab.");
          reject(new Error("Google returned OAuth error: " + error));
          server.close();
          return;
        }

        const state = requestUrl.searchParams.get("state");
        const code = requestUrl.searchParams.get("code");

        if (state !== expectedState) {
          response.writeHead(400, { "content-type": "text/plain" });
          response.end("OAuth state mismatch. You may close this tab.");
          reject(new Error("OAuth state mismatch."));
          server.close();
          return;
        }

        if (!code) {
          response.writeHead(400, { "content-type": "text/plain" });
          response.end("Missing OAuth code. You may close this tab.");
          reject(new Error("OAuth callback missing code."));
          server.close();
          return;
        }

        response.writeHead(200, { "content-type": "text/html" });
        response.end("<h1>Ember & Stone YouTube OAuth complete.</h1><p>You may close this tab and return to PowerShell.</p>");

        server.close(() => resolve(code));
      } catch (error) {
        reject(error);
        server.close();
      }
    });

    server.once("error", (error) => {
      reject(error);
    });

    server.listen(PORT, HOST, () => {
      logInfo("OAuth callback server listening on " + REDIRECT_URI);
    });
  });
}

async function exchangeCodeForToken(client, code) {
  const body = new URLSearchParams();

  body.set("code", code);
  body.set("client_id", client.client_id);
  body.set("client_secret", client.client_secret);
  body.set("redirect_uri", REDIRECT_URI);
  body.set("grant_type", "authorization_code");

  const response = await fetch(client.token_uri, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body
  });

  const text = await response.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw_response_text: text };
  }

  if (!response.ok) {
    fail("Token exchange failed with " + response.status + ": " + text);
  }

  if (!data.access_token) {
    fail("Token response missing access_token.");
  }

  return data;
}

async function saveToken(tokenData) {
  await fs.mkdir(path.dirname(TOKEN_PATH), { recursive: true });

  const safeTokenRecord = {
    created_at: new Date().toISOString(),
    scope: tokenData.scope || SCOPE,
    token_type: tokenData.token_type || "",
    expiry_date: tokenData.expires_in
      ? Date.now() + Number(tokenData.expires_in) * 1000
      : null,
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token || ""
  };

  await fs.writeFile(TOKEN_PATH, JSON.stringify(safeTokenRecord, null, 2));
}

async function main() {
  try {
    logInfo("Starting YouTube OAuth login.");
    logInfo("Secrets will not be printed.");

    const credentials = await readJson(SECRET_PATH);
    const client = getInstalledClient(credentials);
    const state = crypto.randomBytes(24).toString("hex");
    const authUrl = buildAuthUrl(client, state);
    const codePromise = waitForOAuthCallback(state);

    logInfo("Opening browser for Google authorization...");
    openBrowser(authUrl);

    console.log("");
    console.log("If the browser does not open, copy this URL manually:");
    console.log(authUrl);
    console.log("");

    const code = await codePromise;

    logInfo("Authorization code received. Exchanging for local token...");
    const tokenData = await exchangeCodeForToken(client, code);

    await saveToken(tokenData);

    logInfo("Token saved locally. Token value was not printed.");
    logInfo("Saved token path: " + TOKEN_PATH);

    if (!tokenData.refresh_token) {
      console.warn("[WARN] No refresh_token returned. If uploads fail later, revoke app access and rerun OAuth login.");
    }

    logInfo("YouTube OAuth login complete.");
  } catch (error) {
    console.error("[ERROR] YouTube OAuth login failed: " + error.message);
    process.exitCode = 1;
  }
}

await main();
