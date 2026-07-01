---
type: Guide
title: Common Usage Patterns
description: Common workflow patterns and recommended Sage Utils usage.
resource: README.md
tags: [examples, usage, patterns, okf]
timestamp: 2026-07-01T00:00:00Z
---

This concept documents common Sage Utils usage patterns, including the most effective ways to combine prompt construction, model loading, and metadata capture.

## Recommended usage patterns

### 1. Build prompts with Prompt Builder, then refine with the LLM tab
- Start with wildcards and tags in Prompt Builder.
- Generate a base prompt and optionally save it.
- Send the prompt to the LLM tab for refinement or elaboration.
- Use the final prompt in a workflow node.

### 2. Keep positive and negative prompts separate
- Use separate prompt fields for positive and negative prompt content.
- This makes prompt logic clearer and simplifies metadata extraction.
- Connect both streams to prompt-to-conditioning nodes when available.

### 3. Capture metadata explicitly
- Use `Sampler Info` or `KSampler w/ Sampler Info` to expose sampler parameters.
- Use loader nodes that emit `model_info` and LoRA stack details.
- Pass these into `Construct Metadata` for auditability.
- Save image metadata with `Save Image w/ Added Metadata` for A1111 compatibility.

### 4. Use example workflows as templates
- Import an example workflow from `example_workflows/`.
- Inspect how prompt, model, and metadata nodes are connected.
- Adapt the template to your model and prompt requirements.

### 5. Use model cache and diagnostics for maintenance
- Run `Model Scan & Report` to inspect model metadata and duplicates.
- Use `Cache Maintenance` to find and clean ghost cache entries.
- Use `Last LoRA Info` to validate the last LoRA in a stack.

## Best practices

- Keep workflows modular: separate model loading, prompt assembly, generation, and save/export steps.
- Avoid hardcoding provider-specific settings in the workflow. Use shared node outputs instead.
- Favor nodes that produce both the generated artifact and metadata for reproducibility.

## Links

- [ComfyUI Sage Utils README](../README.md)
- [Workflow gallery](workflow_gallery.md)
