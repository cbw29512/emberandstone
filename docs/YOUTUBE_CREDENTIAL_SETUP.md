# YouTube Private Upload Credential Setup

Goal: enable Ember & Stone to upload rendered videos as PRIVATE YouTube review drafts.

Important:
- Do not commit YouTube credentials.
- Do not paste OAuth secrets into chat.
- Do not put YouTube credentials into package.json.
- Upload automation must default to private.
- Public publishing requires manual approval.

Expected local file:

secrets/youtube/client_secret.json

This file should be downloaded from Google Cloud Console as an OAuth 2.0 Client ID JSON file.

Recommended credential type:
- OAuth client
- Desktop app / installed app style credential

Needed API:
- YouTube Data API v3 enabled in the Google Cloud project

Needed OAuth scope later:
- https://www.googleapis.com/auth/youtube.upload

After the file exists locally, run the credential preflight step.
