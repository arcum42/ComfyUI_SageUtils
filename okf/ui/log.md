---
type: Log
title: UI Subbundle Change Log
description: Tracks creation and updates for UI-related OKF concepts.
tags: [log, okf, ui]
timestamp: 2026-07-01T00:00:00Z
---

## 2026-07-01
- Created the `ui` subbundle.
- Added `index.md` and `log.md` for UI documentation.
- Added initial UI concept stubs.
- Added `button_guide.md` concept for button component usage and examples, migrated from legacy documentation.
- Migrated all `BUTTON_COMPONENT_GUIDE.md` content into OKF and redirected the legacy doc to the OKF guide.

## 2026-11-06
- Added a code-based assessment of the sidebar GUI architecture, current issues, and visual and functional improvement opportunities.
- Added a phased implementation plan for sidebar lifecycle, accessibility, visual consistency, workflow improvements, and performance validation.
- Recorded Phase 0 live UI, theme, responsive-width, resource-ownership, and JavaScript test baseline findings in the sidebar modernization plan; expanded the assessment with cleanup risks found during the inventory.
- Implemented Phase 1 sidebar teardown and tab cleanup, including safe tab-mount retry UI, owned Search overlays/requests, Gallery cancellation, Models cleanup, Files shortcut and late-response cleanup, and Prompt Builder feedback timer cleanup. Updated the assessment and TabManager directory documentation; recorded validation and remaining manual checks in the implementation plan.
- Completed Phase 3: added shared banner/empty-state patterns, tokenised shared buttons and forms, stylesheet failure tracking with a retry banner, tab content held until styles settle, and measured contrast across host palettes.
- Started Phase 3: added `--sage-*` design tokens, mapped the tab shell to them, made stylesheet loading deterministic with retry, deduplicated stylesheet IDs, and moved file manager inline styles to `fileManager.css`.
- Implemented Phase 2 navigation: ARIA tablist/tab/tabpanel semantics with roving tabindex and arrow/Home/End keys, status/alert announcements, an always-reachable sticky Settings button, cached tab visibility to avoid the startup flash, focus-visible styles, and reduced-motion handling.
- Started Phase 4 tab migration: Files and Search now use shared tokens, responsive layouts, and class-based file browser/preview/editor styles with keyboard-operable list rows.
- Phase 4: tokenised Gallery and Models stylesheets and fixed narrow-width overflow in gallery grids, controls and the model browser header.
- Phase 4: tokenised Prompt Builder and LLM stylesheets, added focus styles, and made their controls wrap at narrow sidebar widths.
- Phase 4: moved model browser inline styles and JS hover/selection colours into shared CSS classes.
- Phase 4: tokenised the sidebar shell styles and marked the visual-system and responsive findings resolved in the assessment.
- Closed Phase 1/2 gaps: shared modal accessibility helper (focus trap, Escape, focus restore), accessible toasts and confirmation, LLM paste handler visibility guard, export menu cleanup, and removal of dead paste code.
- Phase 6: measured reload-cycle growth, first-use latency and startup long tasks; serialized background tab warmup so mounts no longer stack up.
- Phase 5: added shared `taskStatus.js` long-task pattern and adopted it in the Models tab pull-metadata and report flows.
- Phase 5: added cross-tab text handoff preview with append/replace choice, and held delivery for destination tabs that are not yet mounted.
- Phase 5: added shared recents/favorites store and Models tab star button, recently-selected tracking and Show filter.
- Phase 5: added command palette (js/components/commandPalette.js, patterns.css, cacheSidebar.js button + Ctrl+Shift+K). Commands: Go to <tab>, Open Settings. Recents/favorites commands not yet included.
- Phase 5: task status adopted in the model scan dialog (failure shown as an alert with Retry; progress stays on the dialog's own bars). Gallery loading, LLM generation and Civitai downloads reviewed and left as is (see plan).
- Phase 5: recents/favorites extended to saved prompts (star + All/Starred/Recently loaded filter) and Gallery custom folders (recent folders in the dropdown). Added js/shared/commandRegistry.js; Models tab contributes refresh/scan/report and starred/recent model commands to the palette.
- Gallery: folder dropdown now reads favorites saved by the folder browser ({label,path} or legacy strings).
- Cleanup: plain-text dialog messages, sender warning for disabled destination tab, 240 px clip fixes, structural-sharing updateState, palette commands for Gallery/Files/Prompts/LLM.
- Assessment updated to reflect implemented phases, resolved findings, feature status and the implementation sequence status.
