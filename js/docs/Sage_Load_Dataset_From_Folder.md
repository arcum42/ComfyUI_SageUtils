---
type: NodeDoc
title: Load Dataset From Folder
description: Auto-generated node documentation.
tags: [nodes, docs]
---

# Load Dataset From Folder

* **Node ID:** `Sage_Load_Dataset_From_Folder`
* **Category:** `Sage Utils/train`

Loads images and paired captions from a folder; applies optional prefix/suffix.

## Inputs

### `dataset_path` — `STRING`
- **Name:** `dataset_path`
- **Description:** Path to the folder containing image files and optional caption text files.

### `prefix` — `STRING` (optional)
- **Name:** `prefix`
- **Description:** Optional text prefix to prepend to each caption.

### `suffix` — `STRING` (optional)
- **Name:** `suffix`
- **Description:** Optional text suffix to append to each caption.

### `separator` — `STRING` (optional)
- **Name:** `separator`
- **Description:** Separator used when concatenating prefix/suffix with caption text.


## Outputs

### `images` — `IMAGE`
- **Name:** `images`
- **Description:** Output value for images.

### `filenames` — `STRING`
- **Name:** `filenames`
- **Description:** Output value for filenames.

### `captions` — `STRING`
- **Name:** `captions`
- **Description:** Output value for captions.


## Notes



Generated from the node schema.
