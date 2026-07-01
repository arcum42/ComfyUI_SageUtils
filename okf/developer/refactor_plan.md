---
type: Implementation Note
title: Refactoring Plan
description: Planned refactor work and the rationale behind the Sage Utils implementation.
resource: docs/planning/Refactoring_Plan.md
tags: [developer, refactor, plan, okf]
timestamp: 2026-07-01T00:00:00Z
---

This concept documents the refactor plan for Sage Utils, focused on restoring missing behavior, simplifying the LLM subsystem, and improving maintainability.

# Goals

- Recover lost generation event handling and restore feature parity after refactors.
- Reduce complexity in the LLM sidebar codebase by splitting monolithic modules.
- Improve metadata and provider integration with clearer boundaries.
- Preserve compatibility with existing ComfyUI workflows while stabilizing the completed v3 architecture.

# Key tasks

- Audit the split `llmEventHandlers.js` refactor and restore missing event handling for send/stop, copy, and prompt forwarding.
- Refactor `llmPresetDialogs.js`, `llmAdvancedOptions.js`, and `llmGenerationHandler.js` into smaller, reusable modules.
- Consolidate provider abstraction for LM Studio and Ollama.
- Improve local caching and metadata persistence to reduce redundant model and prompt workload.

# Priorities

1. Fix broken or missing core LLM tab functionality.
2. Simplify the sidebar code structure without changing user-visible behavior.
3. Document the completed migration and the current v3 architecture.
4. Keep the existing install and usage workflows stable for Sage Utils users.

# References

For full implementation details and step-by-step tasks, see `docs/planning/Refactoring_Plan.md`.
