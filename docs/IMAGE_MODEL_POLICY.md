# Ember & Stone Image Model Policy

## Purpose

This document defines how Ember & Stone chooses image generation models.

The channel is intended to run indefinitely, so model choice must protect:

- long-term visual consistency
- cost control
- production-grade quality
- scene beat accuracy
- repeatable recovery from failed generations

## Current Model Roles

### SDXL 1.0

Status: approved for standard atmospheric scenes.

Use for:

- landscapes
- villages
- ruins
- cave mouths
- foggy city scenes
- ritual chambers
- symbolic dark fantasy visuals
- wide establishing shots

Observed strengths:

- strong mood
- strong dark fantasy atmosphere
- good cinematic environments
- good thumbnail-friendly landscapes

Observed limitations:

- weak on exact hand/action beats
- weak on exact subject-count constraints
- weak when prompts require strong negative obedience such as no horses
- not reliable for hard close-up symbol drawing scenes

### FLUX.1 Kontext

Status: tested but not approved for scene 7.

Observed result:

- API worked
- prompt reached model
- failed to produce the required child-hand drawing beat
- drifted into empty room / object composition

Do not use automatically for the current hard scenes.

### Phoenix 1.0

Status: candidate for hard symbolic close-ups with human review.

Observed result:

- API worked
- prompt reached model
- produced a clearer hand/symbol drawing composition than SDXL and FLUX
- may drift toward graphic-novel or comic-like styling
- may introduce stamp/signature-like artifacts

Use only with human review until more tests prove consistency.

## Risk Categories

Low-risk scenes include:

- landscapes
- villages
- caves
- ruins
- bridges
- ritual rooms
- symbolic still-life objects

High-risk scenes include:

- hands drawing
- children actively performing actions
- exact subject counts
- no-horse constraints
- lifeless or dead posture
- close-up symbol actions
- scenes with recurring objects that must remain consistent

## Rules

1. Use SDXL 1.0 for standard atmospheric scenes unless a better approved model is documented.
2. Do not repeatedly spend credits on the same failed prompt and model.
3. High-risk scenes require one-image testing before full regeneration.
4. A model is not promoted from candidate to approved until multiple human-reviewed tests pass.
5. A production image must pass both story beat review and channel consistency review.
6. Every manifest must preserve model, prompt, negative prompt, channel-style status, and beat-lock status.
7. Failed model tests are evidence, not waste. Record what failed so the channel improves over time.

## Promotion Standard

A model can be promoted only after it proves:

- story beat match
- channel style consistency
- no forbidden drift
- no watermark/stamp/logo/fake text artifact
- production-grade composition
- repeatable performance across more than one test

## Long-Running Rule

This policy is permanent until intentionally revised. The channel should never depend on random model choice or blind regeneration.