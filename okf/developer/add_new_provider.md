---
type: Guide
title: Add a New LLM Provider
description: Step-by-step guidance for adding a new LLM provider to Sage Utils.
resource: Unsloth_Project_Docs.md
tags: [developer, llm, provider, okf]
timestamp: 2026-07-01T00:00:00Z
---

This concept documents the steps required to add a new LLM provider to Sage Utils.

## Steps

1. Add a provider key in `utils/llm/provider_keys.py`.
2. Implement a new provider client in `utils/llm/providers/<name>/client.py`.
3. Add initialization logic in `utils/llm/init.py`.
4. Register the provider descriptor in `utils/llm/service.py`.
5. Add provider enable flags in `utils/llm/providers/settings.py`.
6. Wire routes in `routes/llm_routes.py` for model list, status, and generation.
7. Add LLM v3 nodes in `nodes/llm_v3.py` or a new node module.
8. Update frontend provider handling in `js/llm/llmProviders.js`.
9. Add tests for provider initialization, availability, and route contract.

## Notes

Follow the existing Ollama and LM Studio provider patterns for implementation.
Make sure to keep frontend integration decoupled through the service facade and registry.
