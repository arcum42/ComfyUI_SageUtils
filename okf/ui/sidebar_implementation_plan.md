---
type: Plan
title: Sidebar GUI Modernization and Reliability Plan
description: Phased implementation plan for fixing sidebar lifecycle and accessibility issues, unifying its appearance, improving workflows, and validating performance.
tags: [ui, sidebar, implementation-plan, accessibility]
timestamp: 2026-11-06T17:53:01Z
---

# Sidebar GUI Modernization and Reliability Plan

## Purpose

Turn the findings in the [Sidebar GUI assessment](sidebar_assessment.md) into a safe, incremental implementation roadmap. The work modernizes the existing ComfyUI extension sidebar; it does not replace it with a standalone application or adopt the separate SDK rewrite proposal.

## Goals

- Fix resource leaks and make mount, reload, hide, and destroy behavior predictable.
- Make navigation, settings, statuses, and core controls usable by keyboard and assistive technology.
- Create a cohesive visual system that adapts to ComfyUI themes and narrow sidebar widths.
- Improve high-value workflows across tabs without removing current capabilities or changing backend contracts unnecessarily.
- Measure startup and interaction costs before changing preload behavior.

## Guardrails

- Keep ComfyUI's `registerSidebarTab` integration, existing API endpoints, persisted settings, and cross-tab message contracts working.
- Preserve existing tab features and state unless a change is intentionally designed, documented, and tested.
- Prefer ComfyUI theme variables and existing shared components; do not introduce a second incompatible theme.
- Make changes in independently reviewable increments. Avoid a full sidebar rewrite or new framework as a prerequisite.
- Treat command palette, favorites, recents, and a shared task center as proposals whose storage and UX contracts must be defined before implementation.

## Work sequence

### Phase 0: Establish baseline and decisions

**Purpose:** Record current behavior and agree on constraints before changing shared UI.

**Work**

- Inventory listeners, timers, observers, subscriptions, pending requests, and tab mount/destroy behavior in [`js/sidebar/cacheSidebar.js`](../../js/sidebar/cacheSidebar.js), [`js/components/tabs.js`](../../js/components/tabs.js), and each tab factory.
- Record baseline sidebar initial-render time, first-switch time for each tab, preload network activity, and behavior after repeated settings reloads.
- Inspect the ComfyUI host theme variables and identify the narrowest supported sidebar width and relevant zoom levels.
- Capture representative states for each tab: normal, loading, empty, error, disabled, and active/selected.
- Record startup behavior when tab-visibility settings are slow or unavailable, including whether default-visible tabs briefly flash before saved visibility is applied.
- Confirm which feature-level ideas in Phase 5 should be included in the first delivery; keep them separate from reliability and visual foundation work.

**Deliverables**

- A short baseline checklist and observations recorded below.
- Host theme tokens, responsive measurements, current test command, and environment limitations documented for comparison.
- Optional Phase 5 feature scope confirmed before feature work is scheduled.

**Exit checks**

- [x] Existing tab features and settings are inventoried.
- [x] Host theme and responsive behavior are measured at representative widths.
- [x] Normal and empty states are observed for all six tabs.
- [x] Sidebar shell and initial Models panel mount are timed in a fresh browser context; first content timings are captured for all six tabs before idle preloading.
- [x] Optional Phase 5 feature scope is confirmed.

### Phase 0 baseline observations (2026-11-06)

#### Runtime and settings

- The local ComfyUI root and `/sage_utils/settings` endpoint responded successfully. One browser settings request returned HTTP 200 in 31.3 ms; a separate local root request returned HTTP 200 in 66 ms. These are single samples, not performance baselines.
- The six tab-visibility settings were all enabled (`current_value: true`). No persistent settings were changed.
- The primary browser viewport was 913 x 875 CSS pixels. The fresh-context sidebar activation measurement below was separate from this already-running browser session.
- In a separate fresh browser context, clicking the Sage Utils entry showed the sidebar shell after 150.5 ms and initial Models panel content after 196.7 ms. This times sidebar activation within an already-loaded ComfyUI page, not a full ComfyUI cold start or completion of all Models data loading.
- In another fresh context, the initial tab was opened and the other tabs were activated sequentially before the 1.5-second idle-preload delay. Time from each tab activation to its initial content marker was: Models 19.4 ms, Files 71.7 ms, Search 748.9 ms, Gallery 93.6 ms, Prompts 155.0 ms, and LLM 125.4 ms. This is one run measuring initial UI content, not completion of backend data loading; Search was the slowest initial render in this sample.
- The normal loaded state was observed for all six tabs. The Models and Gallery panels showed empty-state UI; Files, Search, Prompts, and LLM showed their normal initial content. No loading or tab-error panel was present at capture. Disabled/error states were not forced because that would require changing persistent settings or simulating failures.
- Warm tab activation from an already running session, measured through two animation frames, was Models 60.4 ms, Files 20.2 ms, Search 18.6 ms, Gallery 19.2 ms, Prompts 18.8 ms, and LLM 18.3 ms. Idle preloading may already have initialized the panels, so these figures do not represent first-mount latency.
- The settings indicator disappeared 1.37 seconds after the fresh-context sidebar click. The implementation intentionally keeps it for about 1.2 seconds after applying settings, so this is not a settings-request latency measurement.
- The browser console also contained errors and warnings from the wider ComfyUI environment, including 404s for user CSS/templates and optional extensions, plus a Vite preload error reporting `app is not defined`. These were not attributed to Sage Utils and must be separated from sidebar regressions in later comparisons.

#### Host theme and responsive layout

The observed ComfyUI dark theme exposes useful variables including `--primary: #0b8ce9`, `--comfy-menu-bg: #161b22`, `--comfy-menu-secondary-bg: #14181F`, `--comfy-input-bg: #2e3440`, `--input-text: #bcc2c8`, `--muted-foreground: #999`, `--border`, and `--ring`. The shared Sage tab bar currently uses a hard-coded green active color rather than the host's blue `--primary`.

| Browser viewport | Sidebar root width | Tab-header client / scroll width | Settings control |
|---|---:|---:|---|
| 913 x 875 | 439.9 px | 405 / 508 px | Hidden |
| 768 x 875 | 296.1 px | 261 / 508 px | Hidden |
| 640 x 875 | 240.1 px | 205 / 508 px | Hidden |

The tab header remains horizontally scrollable at each width, so later tab labels require scrolling. Settings are hidden by the current overflow-width check at all three tested widths. At the default viewport the sidebar content is taller than the host panel and relies on vertical scrolling; this is expected for long feature panels but should be checked for nested-scroll usability. The narrow-width checks are representative, not a declared support minimum.

#### Resource and cleanup inventory

| Surface | Observed resources and current ownership |
|---|---|
| Sidebar shell | `cacheSidebar.js` acquires global `error`/`unhandledrejection` handlers, subscribes to shared state and cross-tab messages, starts a five-minute cache-refresh interval, schedules delayed/preload work, and observes tab-header size. A cleanup registry and per-resource cleanup helpers exist, but the normal instance `destroy()` path only removes the root instead of invoking the registry cleanup. |
| TabManager | Tracks tab initialization timeouts, idle-preload sessions, cleanup callbacks, and per-tab `destroy`/`unmount` callbacks. Tab button listeners are attached to tab-button elements. Current buttons expose no tab roles or `aria-selected` state. |
| Models | `ModelBrowser` installs a keyboard listener and has `destroy()` cleanup. `createModelsTabV2` stores a destroy function on `container._modelsTabV2` but does not return it to `TabManager`, so the manager cannot invoke it through the documented mount-result lifecycle. |
| Files | Returns a destroy callback for the `GenericFileManager`, but registers a document-level Ctrl+S listener without removing it. The status UI also schedules timeouts. |
| Search | Most handlers are attached to tab-owned DOM. Expanded image previews add a document `keydown` handler; Escape removes it, but clicking the overlay removes only the overlay. The async tab factory does not return a cleanup callback. |
| Gallery | Replaces an in-flight folder load with an `AbortController`, but the controller is private to the event-handler setup and no tab-level destroy callback is returned. The factory schedules delayed auto-load work and rendering batches. |
| Prompts | Returns a destroy callback from the tab factory. Some UI effects use delayed callbacks that should be reviewed for cancellation during teardown. |
| LLM | Returns an idempotent unmount/destroy callback. It removes its four cross-tab subscriptions and event handlers and aborts active generation. |
| Styles | The shared loader deduplicates by element ID and logs resolution/append failures, but it does not expose a promise for stylesheet readiness or a user-visible error/retry state. Feature CSS uses a mix of host variables, Sage-specific variables, and literal colors. |

#### Test baseline and decisions

- There is no root `package.json` or dedicated sidebar browser-test runner. The existing standalone JavaScript test uses Node's built-in test runner: `node --test tests/visualResolutionPicker.test.mjs` passed all 3 tests in 85 ms. The Python suite primarily covers backend and LLM behavior.
- Detailed tab-state screenshots, accessibility-tree review, error-state injection, and host light-theme verification remain to be done during the relevant UI phases.
- Prioritize lifecycle correctness and the accessible visual foundation before new Phase 5 feature work. The user chose to defer all optional Phase 5 additions until Phases 1-4 are complete; this scope can be revisited after those foundations are in place.

### Phase 1: Correct lifecycle and resource ownership

**Purpose:** Stop reload/remount leaks before adding more UI behavior.

**Primary files:** [`js/sidebar/cacheSidebar.js`](../../js/sidebar/cacheSidebar.js), [`js/components/tabs.js`](../../js/components/tabs.js), [`js/sidebar/filesTab.js`](../../js/sidebar/filesTab.js), [`js/sidebar/modelsTabV2.js`](../../js/sidebar/modelsTabV2.js), [`js/sidebar/civitaiSearchTab.js`](../../js/sidebar/civitaiSearchTab.js), [`js/sidebar/imageGalleryTab.js`](../../js/sidebar/imageGalleryTab.js), and any tab that owns long-lived handlers or async work.

**Work**

1. Define one idempotent sidebar teardown path. It must mark the instance destroyed, cancel scheduled callbacks and background preload, stop periodic work, unsubscribe from the message bus and shared state, release global error handlers, destroy the `TabManager`, and remove the root.
2. Make `currentSidebarInstance.destroy()`, settings reload, and host unmount all call that same path. Clear references only after cleanup has been requested; repeated destroy calls must be harmless.
3. Ensure asynchronous startup and tab mounts check whether their owner is still active before applying state or attaching resources. Use abort signals for cancellable requests where supported; otherwise ignore late results and release any returned resources.
4. Make tab unmount consistently invoke the factory's returned `destroy`/`unmount` callback. In particular, return the Models browser cleanup currently only stored on its container; provide cleanup from Gallery to cancel its delayed auto-load and abort the active request; and provide cleanup from Search for the image-overlay key handler and any global callback. Review all six factories and ensure their listeners, timers, observers, dialogs, and requests have explicit owners.
5. In Files, retain the Ctrl+S handler reference and remove it during destroy. Only intercept the shortcut when the Files editor is active, a saveable file is selected, and the event is not being handled by an unrelated editable control. Support the platform modifier where appropriate.
6. Prevent a tab from remaining in a perpetual loading state after mount failure; retain an explicit retry path if initialization is safe to repeat.

**Tests and acceptance**

- Mount, settings-reload, and destroy the sidebar repeatedly. Each cycle leaves one active instance and no duplicate refresh interval, global handler, or cross-tab subscription.
- Delayed settings/data responses completing after destroy do not mutate a stale view or recreate resources.
- Mounting and destroying Files repeatedly leaves no active document shortcut handler; Ctrl+S saves only the current Files editor.
- Models unmount calls `ModelBrowser.destroy()`; Gallery unmount aborts an in-flight load and cancels pending auto-load work; clicking outside or pressing Escape to close the Civitai image overlay removes its document listener.
- A failed tab mount shows a clear error state and can be retried without duplicate event handlers.

#### Phase 1 implementation status (2026-11-06)

Implemented:

- Sidebar instance destruction now uses one idempotent path for host cleanup, reload, and explicit cleanup. The lifecycle registry closes during teardown and immediately runs resources registered after closure.
- TabManager teardown no longer activates another tab while removing the active tab; late cleanup registration runs immediately, and mount errors use safe text rendering with a Retry action.
- Models, Files, Search, Gallery, and Prompt Builder now return or own their cleanup. Search requests and image overlays are tab-owned; Gallery cancels auto-load, aborts folder requests, and guards pending render callbacks; Files removes its document shortcut and status timers, and its browser ignores results arriving after destroy; Prompt Builder removes transient feedback and cancels its timers.
- Files Ctrl+S now supports Ctrl/Command, requires a selected file and active Files tab, and leaves unrelated editable controls alone.

Validation completed:

- Changed JavaScript files pass `node --check`.
- `node --test tests/visualResolutionPicker.test.mjs` passes 3/3 tests.
- Two isolated browser mount/switch/destroy cycles left no root, pending init, in-progress init, or initialized-tab state after cleanup. The first run exposed a late Files-browser response against a removed container; the browser now ignores late results.
- An isolated call to `reloadCacheSidebar()` destroyed the old manager/root, created exactly one replacement root, and allowed the new instance to clean up.
- Browser interaction checks confirmed Ctrl+S saves only the selected Files editor (not an unrelated input and not after destroy), and a failed tab mount safely renders error text and retries successfully.

Still to verify manually: toggling tab visibility through the Settings UI and Civitai overlay close paths. The reload function, injected mount-failure/retry, and Files shortcut checks were exercised in isolated browser contexts.

### Phase 2 status (2026-11-06)

Implemented in `tabs.js`, `cacheSidebar.js`, `sidebar.css`, and `layout.css`:
- `TabManager` header is a labelled `role=tablist`; buttons are `role=tab` with stable IDs, `aria-selected`, `aria-controls`, and roving `tabindex`; panels are `role=tabpanel` with `aria-labelledby` and `hidden` when inactive. Arrow Left/Right (wrapping), Home, and End move between visible tabs and focus the new tab.
- Tab loading placeholders use `role=status`; tab mount errors use `role=alert`.
- The Settings button is now a sticky flex item at the header's right edge with an `aria-label`; the width-estimate hide logic and its observer were removed. It stays reachable at every tested width.
- Last-known tab visibility is cached in `localStorage` (`sageutils.tabVisibility`) so hidden tabs no longer flash at startup; defaults apply when there is no cache or the settings request fails.
- Visible `:focus-visible` outlines and a `prefers-reduced-motion` rule were added.

Validated: `node --check`, `git diff --check`, and isolated browser checks at 913/640/400 viewports (Settings in the header's bounds, arrow-key selection and roving tabindex, panel labelling).

Not done in Phase 2 (carried to later phases): dialog focus trapping/restoration and a shared live-region for non-tab status messages, a documented hidden-tab transient-work policy, and replacing the green hard-coded tab colors (Phase 3).

### Phase 2: Accessible, responsive navigation and shared interaction patterns

**Purpose:** Make sidebar controls reachable and consistent before restyling each feature.

**Primary files:** [`js/components/tabs.js`](../../js/components/tabs.js), [`js/components/layout.css`](../../js/components/layout.css), [`js/sidebar/cacheSidebar.js`](../../js/sidebar/cacheSidebar.js), and the shared dialog/status components.

**Work**

- Define tab semantics: a labeled tab list, tabs with stable IDs and `aria-selected`, associated tab panels, correct hidden state, and a roving tab stop.
- Add keyboard navigation for tabs (arrow keys, Home/End, Enter/Space as appropriate), with focus following the selected/roving tab and sensible behavior when tabs are hidden or removed.
- Ensure asynchronous loading and errors are announced; use live regions for dynamic status/progress where appropriate and avoid color-only status cues.
- Provide visible focus indicators, consistent disabled/loading behavior, and predictable focus handling when dialogs open and close.
- Replace the fixed-width settings-button hiding rule with an always-reachable settings control. If space is constrained, use an accessible overflow/menu affordance rather than hiding settings.
- Define responsive behavior for tab navigation and controls at supported widths and browser zoom. Keep primary actions visible or scrollable without accidental clipping.
- Replace the brief all-tabs-visible startup flash with a stable shell or cached visibility state while preferences load; if loading fails, use documented defaults and keep the sidebar usable.
- Define hidden-tab behavior explicitly: preserve safe user-entered state, but pause view-specific polling or transient work until the tab is visible again.
- Respect reduced-motion preferences for transitions and animated loading states.

**Tests and acceptance**

- Keyboard-only users can reach and operate every visible tab, settings control, dialog, and primary action.
- Screen-reader inspection confirms tab labels, selected state, panel association, loading, and error announcements.
- Settings remain available at the narrowest supported width and at 200% zoom.
- Hidden tabs are removed from navigation and focus order; switching to a hidden tab through an external request fails clearly without corrupting active state.

### Phase 3 status (2026-11-06, complete)

Done:
- [`tokens.css`](../../js/components/tokens.css): `--sage-*` tokens for surfaces, text, border, accent, focus, status colors, spacing, control height, radius, and motion. Surfaces, text, and border map to ComfyUI theme variables with the old dark values as fallbacks; muted text is derived from the main text color and the focus ring falls back to it, so both keep contrast on any host palette. Accent, success, warning, and error were darkened so white text meets 4.5:1 (5.1, 5.1, 5.4, 5.6). Motion collapses to 0s under `prefers-reduced-motion`.
- [`patterns.css`](../../js/components/patterns.css) and [`statusBanner.js`](../../js/components/statusBanner.js): shared `.sage-banner` (info/success/warning/error, optional action, `role=alert` for errors, `role=status` otherwise), `.sage-empty-state`, and one focus ring plus disabled and `aria-invalid` treatment for shared buttons and form controls. `buttons.css` and `forms.css` now use the tokens.
- Tab bar, tab buttons, Settings button, and the file manager use tokens; file manager inline styles moved to [`fileManager.css`](../../js/components/fileManager.css).
- Deterministic stylesheet loading: concurrent loads share a promise, load and error are both observed, failures remove the link and are recorded (`getFailedStyles`), and `retryFailedStyles` retries them. Duplicate stylesheet IDs were unified.
- Tab readiness: a mounted tab's content stays hidden (`data-sage-styles="pending"`, `aria-busy`) until in-flight stylesheets settle (4s cap). If any failed, content is shown with a warning banner and a Retry button that reloads them.

Validated: `node --check`, `git diff --check`, and browser checks: failure banner shown and cleared by Retry, no banner on success, no duplicate stylesheet IDs, Files tab uses classes only. Contrast (WCAG ratios) measured for the live theme, a light theme, Nord-like, Solarized-like, and the no-host-variable fallback: text, muted text, and surface-2 text are 4.4 or higher everywhere except Solarized-like values, where the host's own text/input pair is only 4.4 and the focus ring 2.6 (host palette limit; ComfyUI's `--ring` is used when defined). Note: the browser caches stylesheets, so a hard reload is needed after CSS edits.

Carried forward: adopting banners and empty states in each tab happens in Phase 4.

### Phase 3: Shared visual foundation

**Purpose:** Establish common visual language and reusable building blocks before migrating tab-specific CSS.

**Primary files:** [`js/components/layout.css`](../../js/components/layout.css), shared button/form styles, [`js/sidebar/sidebar.css`](../../js/sidebar/sidebar.css), and [`js/file/fileManager.js`](../../js/file/fileManager.js).

**Work**

- Define a compact token set for surface/background levels, primary and muted text, borders, accent, focus, success, warning, error, spacing, control height, radius, and motion.
- Map tokens to ComfyUI theme variables where available, with conservative fallbacks. Confirm text and control contrast in supported themes.
- Standardize section headings, compact headers, cards, buttons, form controls, status banners, empty states, loading indicators, and errors.
- Move inline styles in shared components such as the file manager into CSS classes. Keep feature styles responsible only for feature-specific layout and presentation.
- Make shared stylesheet loading deterministic: deduplicate concurrent loads, observe both load and error outcomes, and avoid showing a tab as fully ready before required styles are available. Keep a safe shell fallback and expose a useful diagnostic/retry path if a feature stylesheet fails.
- Scope styles to Sage Utils classes to avoid leaking into ComfyUI or other custom nodes.
- Add reusable patterns only where at least two surfaces need them; avoid a broad design-system abstraction without repeated use.

**Tests and acceptance**

- Shared controls and states have the same size, focus, disabled, hover, and error behavior across tabs.
- The sidebar follows host theme changes without unreadable combinations or flashes of unrelated colors.
- No shared selector unintentionally changes unrelated ComfyUI UI.

### Phase 4: Migrate and polish tab appearance

### Phase 4 status (in progress)

- Files and Search done: stylesheets tokenised, Search form and results grids made responsive, status regions announced, example images keyboard operable, and the file browser, preview and editor inline styles moved to `fileManager.css` with keyboard-operable listbox rows. Verified at 400, 300 and 240 px with no horizontal overflow.
- Gallery and Models CSS done: hard-coded palette and gradients replaced with tokens, primary button uses `--sage-accent-text`, focus-visible added, thumbnail grids use `min(100%, N px)` columns, gallery controls and metadata label wrap, model browser header wraps. No tab-level overflow at 400 and 240 px.
- `js/file/modelBrowser.js` inline styles moved to classes in `fileManager.css` (hover, selected and highlighted states via CSS classes, badges via tone modifiers, quick actions also revealed on focus-within). Remaining inline styles are the per-row depth indent and the `createButton` style options for quick actions. Verified selection at 400 and 240 px.
- Prompts and LLM CSS done: hard-coded palette, `var(--x, #fallback)` indirections and gradients replaced with `--sage-*` tokens, focus-visible rules added, Prompt Builder controls, tag grids and headers wrap, LLM selection rows wrap and sub-tab labels truncate. LLM has no overflow at 400 and 240 px; Prompt Builder is clean at 400 px apart from the intentional scrolling category strip, and at 240 px only the tag library header still clips about 40 px.
- Shell pass done: the settings indicator and button use tokens and have focus-visible/accent text styling.
- Zoom/theme pass: at a 200 px host width (roughly 200% zoom of a 400 px sidebar), in the live dark theme and a light override, Gallery, Prompts and LLM have no horizontal overflow and Models overflows by about 13 px. Text contrast against the surface measured 9.6:1 (dark) and 16:1 (light). The Files and Search tabs were not included in this pass; they were measured earlier at 240 px.
- Residual clips: Prompt Builder tag library header and the Models info block at 240 px and below.
- Phase 4 is otherwise complete; Phase 6 measurement follows (Phase 5 stays deferred).

**Purpose:** Apply the shared foundation progressively, preserving each tab's behavior.

**Order**

1. **Files and Search:** Address cramped forms, folder/file controls, editor/preview hierarchy, status/error feedback, and narrow-width wrapping.
2. **Gallery and Models:** Standardize dense browsing controls, selection feedback, metadata panels, progress states, and scrolling.
3. **Prompts and LLM:** Align section hierarchy, forms, primary actions, conversation/response surfaces, and nested navigation with the shared patterns.
4. **Sidebar shell:** Final pass on tab bar, settings entry, spacing, active state, and cross-tab transitions.

**Work**

- Replace tab-specific hard-coded palette values and inconsistent gradients with shared tokens.
- Reduce redundant large descriptions and headers where they consume scarce sidebar space; keep essential context available.
- Adapt fixed-width layouts to available space, using wrapping or stacked controls instead of overflow.
- Align loading, no-results, empty, error, retry, and partial-success states while retaining useful tab-specific actions and explanations.
- Verify icons and emoji have labels and do not replace accessible text for important actions.

**Tests and acceptance**

- Review every tab at the agreed width breakpoints, at 100% and 200% zoom, and under each supported ComfyUI theme.
- No primary action, status, selection, or content area is clipped or obscured.
- Feature behavior and cross-tab handoffs match the pre-migration baseline.

### Phase 5: Improve sidebar-wide and tab-specific workflows

**Purpose:** Add functionality on top of stable lifecycle, accessibility, and visual patterns. Deliver each item separately behind a tested interaction contract.

#### 5A. Shared workflow improvements

- **Explicit cross-tab handoff:** Show what content is being sent, preserve its source context, and offer append/replace choices for operations that can overwrite user content. Keep existing message types compatible or version changes deliberately.
- **Consistent long-task feedback:** Use a shared task/status pattern for scans, downloads, gallery batch operations, and LLM generation. Display progress, outcome, and retry guidance; add cancellation only where the underlying operation can actually be cancelled.
- **Recent items and favorites:** First define item identity, persistence, limits, and privacy expectations. Then add recents/favorites for models, folders, images, and saved prompts where the data source supports stable identifiers.
- **Command/action palette:** After action discovery and keyboard conventions are stable, add searchable tab switching and a small set of safe, high-frequency actions. Do not duplicate every feature control or trigger destructive operations without confirmation.

#### 5B. Feature improvements

- **Models:** Add saved filters, recently selected items, clear active-filter summaries, and a comparison view for model details. Reuse existing model selection and metadata APIs.
- **Files:** Add filename search and sorting, dirty-edit indicators, unsaved-change confirmation, and explicit create/rename/delete flows. Persist or restore folder/view state only where it will not silently discard unsaved content.
- **Search:** Preserve search/filter state, show download progress and recoverable errors, and explain NSFW filtering and connectivity in context.
- **Gallery:** Add multi-select, selection counts, and batch actions with cancellable progress when supported. Persist folder/view preferences and confirm destructive operations; provide undo only when the backend can safely support it.
- **Prompts:** Improve variation comparison and editing; show resolved wildcard values and seed details for reproducibility; make copy/save actions clear.
- **LLM:** Show provider availability and model capabilities before generation; align cancellation, retry, history, and prompt handoff behavior between Compose and Chat.

**Tests and acceptance**

- Each addition has a narrow feature contract, handles empty/loading/error states, and does not regress existing settings or saved data.
- Destructive and overwrite actions are explicit and recoverable where technically possible.
- Cross-tab tests cover both append and replace paths, missing/hidden destinations, and stale requests.

### Phase 6: Measure startup, responsiveness, and reliability

**Purpose:** Keep the sidebar responsive without doing unnecessary work.

**Work**

- Compare baseline and post-change initial render, first tab-switch latency, tab initialization time, network requests, and memory after reload cycles.
- Determine whether idle tab warming and delayed gallery preloading provide measurable benefit for typical use.
- Reduce or reprioritize preloading if it competes with interactive work or loads data for rarely used tabs; preserve user-visible correctness when data is not preloaded.
- Keep timing/debug instrumentation opt-in or low-noise, and ensure failures remain visible in user-facing states rather than only logs.

**Tests and acceptance**

- Repeated reload and tab-switch scenarios do not grow listeners, timers, subscriptions, DOM nodes, or memory without bound.
- First-use latency and startup cost meet thresholds agreed from the Phase 0 baseline.
- Network failure, slow responses, and offline/unavailable optional providers leave usable retry or fallback states.

### Phase 6 status (2026-11-06)

Measured in the running ComfyUI page with a 400 px host, headless Chromium via CDP (single machine, small samples; treat as indicative).

- **Reload cycles:** 6 create/use-all-tabs/destroy cycles after a forced GC. The first cycle adds a one-time ~80 MB heap, ~1600 listeners and ~4000 nodes (module load, shared caches, stylesheets). Later cycles add about +2 MB heap, +2 listeners and +8 nodes each, with no growth in attached DOM nodes, documents or stylesheet elements. Treated as bounded shared state, not a per-tab leak; a detached-node heap snapshot is the next step if it needs to be driven to zero.
- **Timing:** shell mount 2-14 ms (first) and ~155 ms (re-mount after settings fetch). Cold first-tab content: Models ~1.0 s, Files ~0.25 s, Search ~0.65 s, Gallery/Prompts/LLM ~25-35 ms; warm switches are below the 25 ms polling resolution. Idle warmup therefore removes a visible 0.25-1 s first-use cost and is kept.
- **Warmup contention found:** background mounts were all started within ~70 ms of each other, giving long tasks of 1009, 334 and 311 ms at ~2-4 s after startup. Fix: `preloadTabsDuringIdle` in `js/components/tabs.js` now waits for each background mount to settle (bounded to 10 s, cancellable) before scheduling the next, so mounts start one at a time (verified: all six tabs still initialise). Total long-task time in the first 6 s dropped from ~1.9 s to ~1.5 s; one ~850 ms task remains in the LLM tab mount (first mount, synchronous work) and is a candidate for splitting.
- **Network:** startup issues two cache requests (`sage_cache/hash`, `sage_cache/info`) once each and four `sage_utils/settings` requests (some by ComfyUI itself); no per-tab duplicate data fetches. No change made.
- Not done: forced offline/slow-provider failure scenarios, and the LLM first-mount split.

## Gap closure status

- Dialogs: `js/components/modalA11y.js` provides focus trap, Escape (topmost only) and focus restore. `createDialog`, the LLM preset/template dialogs and the Gallery folder browser use it; Search and info-display image lightboxes got dialog roles and their own Escape handling (info display no longer leaks its Escape listener on backdrop click).
- Announcements: toasts are a polite live region (errors use `role=alert`); `showConfirmation` is an accessible dialog. A separate announcer was judged unnecessary.
- Hidden-tab policy: document-level listeners must act only when their tab is displayed and must be removed in `destroy`. The LLM paste handler now ignores pastes when its vision section is not displayed; the dead `setupClipboardPasteHandler` was removed; the history export menu closes on Escape and cleans up its listeners.
- Browser-verified: dialog focus trap, Escape, focus restore, and overlay helper auto-release. Still manual: Settings-UI tab visibility reload and Search lightbox close.

## Leftover cleanup status

- Dialogs: `confirmDialog`, `alertDialog` and `promptDialog` render messages as plain text (no HTML interpolation); verified an `<img onerror>` message stays inert.
- Handoff: if the destination tab is disabled, the pending text is discarded and a warning toast says to enable the tab (`discardPendingForTab` on the bus). Not browser-tested end to end.
- 240 px: Prompt Builder tag-library buttons wrap, seed input has padding, Models info block wraps; no unintended clips at 240 px or 200 px.
- Performance: `updateState` uses structural sharing instead of four deep JSON clones. Warm-cache long tasks in the first 6 s dropped from about 1.5 s to about 0.7 s; a cold run still shows one task of about 950 ms.
- Palette: Gallery (reload, Notes/Input/Output, recent folders), Files (Notes/Wildcards), Prompts and LLM (focus prompt) contribute commands; providers unregister on tab destroy.
- Not done: offline and slow-provider scenarios, and the manual checks (Settings-UI tab visibility, Search lightbox close).

## Release increments

Keep the work reviewable in these increments:

1. **Reliability patch:** Phase 1 only, with regression tests for cleanup and Files shortcut ownership.
2. **Navigation/accessibility patch:** Phase 2 and its keyboard/screen-reader checks.
3. **Visual foundation patch:** Phase 3, including theme and narrow-width verification.
4. **Tab migration patches:** Phase 4 in the stated order; avoid combining all six tabs into one change.
5. **Workflow feature patches:** Phase 5A and 5B items individually, ordered by user value and backend readiness.
6. **Performance tuning patch:** Phase 6 based on measured results, not intuition alone.

Each increment should include relevant documentation updates and a short before/after validation note. Do not bundle unrelated feature work with lifecycle fixes.

## Definition of done

- All confirmed lifecycle and keyboard-listener issues in the assessment are fixed and covered by repeatable tests.
- Settings and tabs work with keyboard, assistive technology, supported themes, narrow widths, and zoom.
- Shared interaction and visual patterns are used consistently across all six tabs.
- New functionality preserves existing backend and message-bus behavior or documents a deliberate compatibility change.
- Baseline metrics have been compared with the final behavior, and preload changes are supported by measurements.
- No known regressions remain in tab visibility settings, saved data, dialogs, feature actions, or cross-tab handoffs.

### Phase 5 status: command palette
Done: `openCommandPalette(commands)` (listbox, arrow keys, Enter, Escape via modalA11y), opened by a header button or Ctrl+Shift+K inside the sidebar. Lists tab navigation and Open Settings. Browser-verified. The items this once listed as not done (recents entries, per-tab registration, prompts/Gallery recents, task status adoption) are covered in the later Phase 5 sections below.

### Phase 5 status: task status adoption
- Scan dialog: failures now show `createTaskStatus` fail state with Retry; browser-verified with a stubbed 500.
- Gallery: folder loading already has an in-grid progress bar, abort handling and an error view; no batch operations exist. Not changed.
- LLM generation: already has status line, progress bar and Stop button in the response section. Not changed.
- Civitai downloads: the Download button opens the Civitai URL in a new browser tab, so the app cannot track progress. Not changed.

### Phase 5 status: recents/favorites and palette commands
- Saved prompts: star button per card, "All / Starred / Recently loaded" filter; ids are prompt ids (`prompt` collection).
- Gallery: up to 5 recent custom folders listed in the folder dropdown (`galleryfolder` collection), recorded when a custom folder is selected or browsed.
- Files tab: only two fixed folders (Notes, Wildcards), so recents do not apply.
- Palette: tabs contribute commands via `registerCommandProvider` (`js/shared/commandRegistry.js`), unregistering in destroy. Models provides Refresh, Open scan dialog, Generate report and starred/recent models; a command with a `tab` switches to it first. Browser-verified.
- Fixed: `sageutils_folder_favorites` holds `{label,path}` objects (written by the folder browser dialog); `populateFolderDropdown` now accepts both objects and legacy plain strings, shows the label with a star, and ignores malformed entries.
