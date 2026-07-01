---
type: Guide
title: Python Node Architecture
description: Architecture of Sage Utils Python nodes and custom I/O types.
resource: Unsloth_Project_Docs.md
tags: [architecture, nodes, okf]
timestamp: 2026-07-01T00:00:00Z
---

This concept documents the Python node architecture for Sage Utils, including node categories and custom I/O types.

## Node architecture

Sage Utils Python nodes use the ComfyUI v3 API (`comfy_api.latest.io`).
Each node class defines:
- `define_schema()` — node inputs, outputs, and metadata
- `execute(**kwargs)` — graph construction or output generation

## Custom I/O types

Custom types allow structured data to flow through the graph.
Examples include:
- `ModelInfo` / `UnetInfo` / `VaeInfo` / `ClipInfo`
- `ModelShiftInfo`
- `LoraStack`
- `TilingInfo`
- `SamplerInfo`
- `AdvSamplerInfo`
- `AdvAudioInfo`
- `OllamaOptions`

These types improve contract clarity and avoid string-encoded data passing.

## Key node categories

### Loader nodes
- `Sage_LoadModelFromInfo`
- `Sage_UNETLoaderFromInfo`
- `Sage_CheckpointLoaderSimple`
- `Sage_CheckpointLoaderRecent`

### Sampler nodes
- `Sage_SamplerSelector`
- `Sage_SchedulerSelector`
- `Sage_SamplerInfo`
- `Sage_AdvSamplerInfo`
- `Sage_KSampler`
- `Sage_AceAdvSampler`

### LLM nodes
- `Sage_ConstructLLMPrompt`
- `Sage_OllamaLLMPromptText`
- `Sage_LMStudioLLMPromptText`
- `Sage_ConstructMetadataLite`
- `Sage_ConstructMetadata`

### Metadata nodes
- `Sage_ConstructMetadataFlexible`

### Other node modules
- `prompts_v3.py`
- `text_v3.py`
- `image_v3.py`
- `conditioning_v3.py`
- `audio_v3.py`
- `selector_v3.py`
- `util_v3.py`
- `training_v3.py`
- `ollama_v3.py`
- `lmstudio_v3.py`

## GraphBuilder pattern

When nodes need to create sub-graphs, they use `GraphBuilder` to instantiate additional graph nodes and return an expandable subgraph. This keeps node definitions composable and dynamic.
