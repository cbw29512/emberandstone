# Repeatable Channel Pipeline Setup Playbook

Use this when creating the same kind of automated faceless channel pipeline for a different subject.

## Step 1 — Create the Local Folder

Pick one clear folder path and use it everywhere.

Example:

C:\Users\divcl\OneDrive\Desktop\EmberAndStone

Never guess paths. Always verify with:

Get-ChildItem -Force

## Step 2 — Protect Secrets First

Create or update .gitignore before initializing or pushing to GitHub.

Required ignored files:

APIKeys.txt
.env
.env.local
*.key
*.pem

## Step 3 — Create Project Structure

Required folders:

.github\workflows
content
scripts
assets\music
output
docs

## Step 4 — Define the Project Before Coding

Create PROJECT_BLUEPRINT.md with:

- Objective
- Definition of Done
- Data Schema
- State Logic
- Code Rules

Do not write automation code until this exists.

## Step 5 — Create State Files

Required starter files:

content\topic-queue.json
content\published.json
content\run-log.jsonl

## Step 6 — Validate Before Git

Confirm all required files exist with Test-Path.

## Step 7 — Initialize Git Safely

Run git init only inside the confirmed project folder.

Use git check-ignore -v APIKeys.txt before staging files.

## Step 8 — First Commit

Only commit safe blueprint/state/scaffold files.

Do not commit secrets.
Do not commit generated videos.
Do not commit local output.

## Step 9 — Connect GitHub

Create a new GitHub repo for the new subject, then add the remote and push main.

## Step 10 — Only Then Add Automation

Automation should be added in this order:

1. schema validation
2. topic queue management
3. script generation
4. voice generation
5. image generation
6. video rendering
7. upload workflow
8. scheduled GitHub Action

## Universal Rule

Every new subject gets its own:

- folder
- GitHub repo
- PROJECT_BLUEPRINT.md
- Definition of Done
- Data Schema
- topic queue
- published tracker
