---
type: Guide
title: LLM Architecture Note
description: Architecture notes for the LLM integration and related UI features.
resource: docs/LLM_ARCHITECTURE_NOTE.md
tags: [architecture, llm, guide, okf]
timestamp: 2026-07-01T00:00:00Z
---

This concept documents the architecture of the Sage Utils LLM subsystem.
It covers provider abstraction, streaming text responses, vision support, and the session model used by the UI.

# Provider abstraction

Sage Utils supports local providers such as LM Studio and Ollama.
The architecture keeps provider-specific details behind a shared interface so the UI can:
- select available models,
- send text generation requests,
- receive streaming text,
- and submit image/vision inputs.

# Streaming and response handling

Streaming responses are implemented with Server-Sent Events (SSE) to provide real-time output in the LLM tab.
This design accommodates partial updates and improves UX for longer responses.

# Vision-enabled workflows

The LLM tab supports image upload and analysis for vision-capable models.
Uploaded images are sent alongside prompt inputs and handled by provider-specific vision endpoints.

# Conversation state

The LLM subsystem tracks conversation threads and history so users can:
- maintain multi-turn interactions,
- resume prior threads,
- export or import conversation state,
- and clear history while preserving settings.

# Cross-tab integration

LLM output is designed to flow into the Prompt Builder and other tabs.
That integration is intentionally loose: the LLM tab can send text and image results to other components without requiring those components to share implementation details.

# References

See the linked source document for implementation-level diagrams, provider APIs, and detailed tradeoffs.
