---
type: NodeDoc
title: Visual Resolution Picker
description: Select image dimensions using a draggable aspect-ratio grid.
tags: [nodes, docs]
---

# Visual Resolution Picker

Set `longest_side` in pixels, then click or drag on the grid to choose a
rectangle. The grid width and height controls are editable and are saved with
the workflow. Use **Swap width and height** to exchange the rectangle's sides.

Before scaling, the longest side is exactly the requested value and the shorter
side is rounded to the nearest multiple of 8, with a minimum of 8. The
`multiplier` (default 1, range 0.1 to 10) then scales both dimensions, rounding
each to the nearest pixel (half up). For example, a 2:1 rectangle with a
longest side of 1024 and multiplier of 1.5 outputs 1536 by 768. Scaled
dimensions are not constrained to multiples of 8 and can exceed ComfyUI's
maximum resolution; downstream nodes may impose their own limits.

The node accepts longest-side values from 8 to ComfyUI's maximum resolution.
A linked longest side or multiplier is calculated at execution time rather
than previewed on the grid.

Connect the `width` and `height` integer outputs to the corresponding inputs
on an image or latent node.
