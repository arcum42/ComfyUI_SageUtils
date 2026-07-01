---
type: Guide
title: Tab Manager Design
description: Design notes for the Sage Utils tab manager and sidebar integration.
resource: docs/deprecated/TAB_MANAGER_GUIDE.md
tags: [architecture, ui, guide, okf]
timestamp: 2026-07-01T00:00:00Z
---

This concept describes the design of the Sage Utils tab manager and sidebar integration.
It documents how tabs are registered, how active state is preserved, and how cross-tab messages are routed.

# Tab lifecycle

Tabs are created as ComfyUI sidebar panels, with one or more subtabs for features like LLM chat and Prompt Builder.
The manager handles:
- tab registration with ComfyUI,
- initial state hydration,
- active tab persistence across refreshes,
- and cleanup when the bundle unloads.

# Cross-tab messaging

The tab manager provides a transport for messages between UI surfaces.
Common message flows include:
- sending generated prompts from the LLM tab to Prompt Builder,
- passing selected images from the gallery to the LLM tab,
- broadcasting configuration changes to all tabs.

# UI placement

The Sage Utils tabs are designed to appear in the sidebar without disrupting core ComfyUI workflows.
They follow ComfyUI styling and accessibility conventions, while exposing custom controls for Sage-specific functions.

# Notes

This design prioritizes decoupling: tabs communicate through messages rather than direct function calls, so new tabs can be added without changing existing ones.

# References

See the linked tab manager guide for implementation patterns, message types, and examples of tab registration code.
