---
type: Guide
title: Testing Overview
description: Reference for the Sage Utils Python test suite and developer test coverage.
resource: tests/
tags: [developer, testing, okf]
timestamp: 2026-07-01T00:00:00Z
---

This concept documents the Sage Utils testing approach and the key test modules included in the repository.

## Test coverage

The Python test suite focuses on backend and LLM provider behavior, including:

- `test_llm_service.py`
- `test_llm_registry.py`
- `test_llm_provider_keys.py`
- `test_llm_routes_helpers.py`
- `test_llm_routes_contract.py`
- `test_llm_compat.py`
- `test_llm_init.py`
- `test_llm_provider_availability.py`
- `test_ollama_capabilities.py`
- `test_ollama_tool_loop.py`
- `test_logger.py`

## Purpose

These tests validate provider initialization, availability detection, route helper behavior, and logging integration. They are intended to catch regressions in the LLM backend and route contract behavior.
