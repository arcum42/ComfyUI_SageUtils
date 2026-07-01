---
type: Guide
title: Prompt Builder Guide
description: Guide to using the Prompt Builder in Sage Utils.
resource: docs/PROMPT_BUILDER_GUIDE.md
tags: [ui, prompt-builder, guide, okf]
timestamp: 2026-07-01T00:00:00Z
---

This concept documents the Prompt Builder experience, including tag libraries, wildcard-driven prompt generation, and LLM enhancement workflows.

## Key capabilities

- **Wildcard prompt generation** using `__category__` syntax.
- **Organized tag library** with category-based tag insertion.
- **Positive and negative prompt support** for clean prompt separation.
- **Seeded variation generation** for reproducibility.
- **Saved prompts** and prompt collection management.
- **Cross-tab integration** with the LLM chat tab.

## Recommended workflow

1. Open Prompt Builder.
2. Compose a prompt with wildcards, e.g. `__character__ in a __location__`.
3. Use the tag library to add categories and weights.
4. Generate prompt variations.
5. If needed, send the prompt to the LLM tab for refinement.
6. Copy or send the final prompt to your workflow nodes.

## Best practices

- Use wildcards for repeatable structure and variation control.
- Keep positive and negative prompts in separate fields.
- Save working prompts as templates for future reuse.
- Use seed control when you need consistent results across runs.

## Cross-tab usage

- Send a constructed prompt to the LLM tab to improve phrasing or detail.
- Receive enhanced prompts back in Prompt Builder for further editing.
- Use the combined system to move from concept to polished prompt quickly.

For full examples and advanced options, see `docs/PROMPT_BUILDER_GUIDE.md`.
