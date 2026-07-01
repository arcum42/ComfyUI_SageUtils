---
type: Guide
title: LLM Chat Tab Guide
description: Guide to using the integrated LLM chat tab in Sage Utils.
resource: docs/deprecated/LLM_TAB_GUIDE.md
tags: [ui, llm, guide, okf]
timestamp: 2026-07-01T00:00:00Z
---

This concept describes the LLM Chat Tab experience in Sage Utils, including provider selection, prompt workflows, vision support, and cross-tab integration.

## Key capabilities

- **Local provider support** for LM Studio and Ollama.
- **Real-time streaming** output with Server-Sent Events (SSE).
- **Vision-enabled prompts** with image upload and analysis.
- **Conversation history** with saved threads and transcript view.
- **Cross-tab integration** with Prompt Builder for prompt handoff.
- **System prompt and preset management** for repeatable workflows.

## Recommended workflow

1. Open the LLM tab in the sidebar.
2. Select a provider and model.
3. Enter a prompt in the Compose or Chat subtab.
4. Send using the button or Ctrl+Enter.
5. Review the streamed response.
6. Optionally send the response to Prompt Builder or copy to a node.

## UX patterns

- Use **Compose** for one-shot prompt generation.
- Use **Chat** for multi-turn conversations with saved history.
- Use **Settings** for low-frequency controls like system prompts, advanced provider options, and history limits.

## Troubleshooting notes

- If the provider is unavailable, verify the local LM Studio or Ollama service is running.
- Use the response stream to catch generation progress early.
- When vision mode is enabled, image uploads are handled by the provider’s vision endpoint and may require a vision-capable model.

For detailed setup, provider configuration, and troubleshooting, see `docs/LLM_TAB_GUIDE.md`.
