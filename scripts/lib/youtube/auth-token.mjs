// scripts/lib/youtube/auth-token.mjs
// Loads and refreshes YouTube OAuth tokens without printing secrets.

import { fail, logInfo, readJson, writeJson } from "./common.mjs";

function getOAuthClient(credentials) {
  const client = credentials.installed || credentials.web;

  if (!client) fail("OAuth credentials missing installed/web block.");
  if (!client.client_id) fail("OAuth credentials missing client_id.");
  if (!client.client_secret) fail("OAuth credentials missing client_secret.");
  if (!client.token_uri) fail("OAuth credentials missing token_uri.");

  return client;
}

export async function loadFreshToken(paths) {
  const credentials = await readJson(paths.secretPath);
  const token = await readJson(paths.tokenPath);
  const expiryDate = Number(token.expiry_date || 0);
  const expiresSoon = !expiryDate || expiryDate < Date.now() + 120000;

  if (!expiresSoon && token.access_token) {
    return token;
  }

  if (!token.refresh_token) {
    fail("Token is expired or near expiry and no refresh_token exists. Rerun npm run auth:youtube.");
  }

  return refreshAccessToken(credentials, token, paths.tokenPath);
}

async function refreshAccessToken(credentials, token, tokenPath) {
  const client = getOAuthClient(credentials);
  const body = new URLSearchParams();

  body.set("client_id", client.client_id);
  body.set("client_secret", client.client_secret);
  body.set("refresh_token", token.refresh_token);
  body.set("grant_type", "refresh_token");

  const response = await fetch(client.token_uri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    fail("Token refresh failed with " + response.status + ": " + text);
  }

  if (!data.access_token) {
    fail("Token refresh response missing access_token.");
  }

  const refreshedToken = {
    ...token,
    access_token: data.access_token,
    token_type: data.token_type || token.token_type || "Bearer",
    scope: data.scope || token.scope || "",
    expiry_date: data.expires_in
      ? Date.now() + Number(data.expires_in) * 1000
      : token.expiry_date,
    refreshed_at: new Date().toISOString()
  };

  await writeJson(tokenPath, refreshedToken);
  logInfo("OAuth access token refreshed. Token value was not printed.");

  return refreshedToken;
}