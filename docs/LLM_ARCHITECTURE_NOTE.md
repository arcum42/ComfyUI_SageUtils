# LLM Architecture Note (Phase 6)

## Purpose

This note captures the current canonical LLM backend shape after Phase 5 cleanup, and gives one place to reference provider identity, lifecycle ownership, and extension points.

## Canonical Provider Keys

Canonical backend provider keys are:

- `lmstudio_rest`
- `ollama_rest`
- `openai`
- `native` (routes/UI only)

Source of truth:

- `utils/llm/provider_keys.py`

This module defines key constants and alias normalization.

Route/provider-set constants:

- `ROUTE_PROVIDER_KEYS` defines accepted route provider keys.
- `SERVICE_PROVIDER_KEYS` defines provider keys used by service registry descriptors.

## Compatibility Aliases

Legacy request aliases are still accepted at route boundaries:

- `lmstudio` -> `lmstudio_rest`
- `ollama` -> `ollama_rest`

Normalization entry points:

- `utils/llm/provider_keys.py` via `normalize_provider_key(...)`
- `utils/llm/routes_helpers.py` via `normalize_provider(...)` (thin wrapper)

Design intent:

- Keep old presets/request payloads working.
- Keep internal service/provider logic strictly canonical.

## Provider Lifecycle State Ownership

Runtime provider lifecycle state is owned by:

- `utils/llm/registry.py`

Key structures:

- `ProviderDescriptor`: static provider metadata (key, feature flag, display name, initializer)
- `ProviderState`: mutable runtime state (initialized, available, last_checked)
- `ProviderRegistry`: registration and state mutation/access

Facade/state synchronization is managed in:

- `utils/llm/service.py`

`service.py` registers provider descriptors, ensures initialization, and synchronizes module-level compatibility flags from registry state.

## Route Integration Model

Route layer behavior:

- Accepts legacy aliases and canonical keys from request payloads.
- Normalizes provider keys before dispatch.
- Returns canonical provider keys in status/model payload structures.

Main files:

- `routes/llm_routes.py`
- `utils/llm/routes_helpers.py`

## How To Add A New Provider

1. Add provider key constants and alias rules to `utils/llm/provider_keys.py`.
2. Implement provider client module under `utils/llm/providers/<provider>/` using current provider-client contract patterns.
3. Add descriptor registration in `utils/llm/service.py` (`_PROVIDER_DESCRIPTORS`).
4. Wire provider globals/maps in `utils/llm/service.py` for compatibility availability/state exposure.
5. Add route-level model/status/generate wiring in `routes/llm_routes.py` if the provider is user-selectable from routes.
6. Extend tests:
   - `tests/test_llm_service.py`
   - `tests/test_llm_routes_helpers.py`
   - Provider-specific tests as needed.
7. Update docs (`docs/LLM_FOLDER_REFACTOR_PLAN.md`, `routes/LLM_ROUTES_README.md`) with canonical key behavior.

## Current Constraints

- `native` is a route/UI provider mode and not part of service registry descriptors.
- Provider capability payloads remain provider-specific where APIs differ; only dispatch identity/state is centralized.
