---
type: NodeDoc
title: Ace Step 1.5 Audio Encode
description: Auto-generated node documentation.
tags: [nodes, docs]
---

# Ace Step 1.5 Audio Encode

* **Node ID:** `Sage_Ace15AudioEncode`
* **Category:** `Sage Utils/audio`

Encodes an audio clip into a conditioning using the Ace Step 1.5 model. This is used to create a conditioning from an audio reference.

## Inputs

### `clip` — `CLIP`
- **Description:** The audio clip to encode into Ace Step 1.5 conditioning.

### `tags` — `STRING`
- **Description:** Descriptive tags or prompts for the audio encoding.

### `lyrics` — `STRING`
- **Description:** Lyrics or vocal metadata to include during audio encoding.

### `seed` — `INT`
- **Description:** Random seed used for encoding determinism.

### `duration` — `FLOAT`
- **Description:** Target duration of the encoded audio in seconds.

### `bpm` — `INT`
- **Description:** Beats-per-minute tempo used for audio conditioning.

### `timesignature` — `COMBO`
- **Description:** Time signature for the encoded audio.

### `keyscale` — `COMBO`
- **Description:** Musical key and scale for the encoded audio.

### `generate_audio_codes` — `BOOLEAN`
- **Description:** Enable LLM-generated audio codes for higher-quality audio encoding.

### `adv_audio_info` — `ADV_AUDIO_INFO`
- **Name:** `Advanced Audio Info`
- **Description:** Advanced audio encoding settings for Ace Step 1.5.


## Outputs

### `None` — `CONDITIONING`
- **Description:** The generated Ace Step 1.5 conditioning for audio.


## Notes



Generated from the node schema.
