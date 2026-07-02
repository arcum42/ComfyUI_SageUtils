# Sage_PonyPrefix

**Add Pony v6 Prefixes**

Creates Pony v6 prefixes for prompt engineering based on score, rating, and source parameters.

## Inputs

- **add_score** (boolean, required): Whether to include score prefixes (score_9, score_8_up, etc.)
- **rating** (string, required): Content rating - Options: "none", "safe", "questionable", "explicit"
- **source** (string, required): Content source - Options: "none", "pony", "furry", "anime", "cartoon", "3d", "western", "comic", "monster"

## Outputs

- **STRING**: Generated prefix string containing the selected score, rating, and source tags

## Usage

Use to automatically generate appropriate prefixes for Pony v6 models. The node combines score tags (if enabled), source tags, and rating tags into a properly formatted prefix string that can be prepended to your main prompt.
