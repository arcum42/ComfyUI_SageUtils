---
type: Guide
title: Logging Guidance
description: Logging strategy and best practices for Sage Utils.
resource: docs/deprecated/LOGGING.md
tags: [architecture, logging, guide, okf]
timestamp: 2026-07-01T00:00:00Z
---

This concept documents the logging strategy for Sage Utils, including log categories, event capture, and how developers should interpret and troubleshoot logs.

# Logging goals

- Make LLM and workflow behavior observable.
- Preserve enough context to diagnose provider and tab issues.
- Avoid noisy logs in normal usage.
- Keep logging local and opt-in where needed.

# Categories

Common log categories include:
- provider connectivity and request lifecycle,
- metadata cache refresh and model lookups,
- UI event handling and cross-tab messaging,
- diagnostics for prompt builder and workflow execution.

# Interpretation

Logs are intended for developers and advanced users.
They should help answer questions such as:
- why did a provider request fail?
- what prompt data was sent to the model?
- did a model metadata lookup hit the cache or fall back to a query?

# References

See the linked source document for config options, log level guidance, and example log files.
