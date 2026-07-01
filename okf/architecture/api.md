---
type: Guide
title: API Guidance
description: API design and service contract guidance for Sage Utils.
resource: docs/API.md
tags: [architecture, api, guide, okf]
timestamp: 2026-07-01T00:00:00Z
---

This concept captures the backend API surfaces exposed by Sage Utils and the intended usage patterns for service interactions.

# Service responsibilities

Sage Utils backend APIs handle:
- provider configuration and health checking,
- local model metadata lookup and cache refresh,
- saving and loading user presets,
- serving example workflow metadata,
- and supporting LLM requests from the UI.

# API design principles

- Keep APIs local and self-contained — most calls are designed for the installed ComfyUI instance.
- Avoid introducing new external dependencies or remote telemetry.
- Support graceful degradation when provider services are unavailable.

# Common endpoints

Typical service endpoints include:
- provider discovery and model listing
- generation request submission
- streaming response consumption
- metadata cache validation
- saved preset management

# Notes

The API spec is intentionally aligned with the local deployment model of Sage Utils: no cloud-only assumptions, and all UI behavior should remain functional when the local ComfyUI instance is running with installed providers.

# References

See the linked document for route-level details and examples of request/response shapes.
