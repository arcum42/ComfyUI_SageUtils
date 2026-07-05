# SageUtils — Refactoring & Simplification Analysis

> **Purpose**: An honest assessment of where this project has grown beyond what it needs to be, with concrete, prioritized recommendations for simplification following KISS (Keep It Simple, Stupid) and YAGNI (You Aren't Gonna Need It) principles.

---

## Executive Summary

SageUtils is a functional, feature-rich ComfyUI custom node pack with 100+ nodes and a rich sidebar. However, the codebase has accumulated significant complexity that obscures maintainability. The most severe issues cluster in three areas:

1. **The LLM tab** — ~9,500 lines of JS spread across 20+ files, with massive over-engineering for what is essentially a chat interface
2. **Performance tooling** — ~925 lines of performance monitoring/diagnostics code that adds complexity with minimal real-world value
3. **Abstraction bloat** — Multiple layers of indirection in both JS and Python that make simple tasks hard to understand

This document identifies specific problems, estimates the impact of fixing them, and provides actionable recommendations ordered by priority.

---

## 1. CRITICAL — LLM Tab Massive Over-Engineering

### Problem

The LLM tab (`js/sidebar/llmTab/`) is **~9,500 lines across 20+ files**, when a functional chat interface with provider/model selection, settings, and streaming should be ~1,500–2,000 lines total. This is the single largest source of complexity in the entire project.

### Specific Issues

#### 1a. `llmEventHandlers.js` — 1,300 lines
**The core problem.** This file wires up every possible event on every possible UI element into one massive function with nested conditionals.

```javascript
// Current: ONE function handling ~40+ different events
export function setupEventHandlers(
    state, wrapper, modelSelection, visionSection, inputSection,
    sendBtn, advancedOptions, responseSection, historySection,
    app, showNotification, showStatus, applyPresetToUI,
    resetSettingsToDefaults, updateConversationList
) {
    // Gets all elements...
    // Then has 40+ event listeners inline
}
```

**Problems:**
- One giant function with ~1,300 lines
- All event wiring in one place means you can't understand any single feature without reading the whole file
- No clear separation between provider events, preset events, template events, etc.
- Uses inline anonymous functions for most handlers

**Recommendation:** Split into focused modules:
```
llmEventHandlers/
├── providerEvents.js      # Provider/model selection events (~100 lines)
├── presetEvents.js        # Preset management events (~150 lines)
├── templateEvents.js      # Template selector events (~80 lines)
├── generationEvents.js    # Send/stop/copy events (~200 lines)
└── index.js               # Orchestrator that wires them together
```

Each file should have small, testable functions. Use event delegation where possible.

#### 1b. `llmPresetDialogs.js` — 1,200+ lines
**Massive dialog system for what should be simple preset management.**

The file implements:
- Save preset dialog (simple form)
- Manage presets dialog with tabs (presets + system prompts)
- Preset list with edit/delete/rename
- System prompt management with per-provider presets
- Inline tab navigation inside the dialog

**Problems:**
- The "manage presets" dialog is ~800 lines — this should be a separate page or much simpler modal
- Creates DOM elements manually instead of using existing component system
- Has its own tab implementation when `components/tabs.js` already exists
- System prompt management per-provider is YAGNI — most users don't need this

**Recommendation:**
1. **Cut the manage presets dialog to 200 lines**: Only show save/delete, not inline editing
2. **Move system prompts to a simple settings section**, not a separate tab
3. **Use existing component system** (`formElements.js`, `tabs.js`) instead of manual DOM creation
4. **Expected result:** ~300 lines, 75% reduction

#### 1c. `llmAdvancedOptions.js` — 1,037 lines
**Over-engineered settings UI with HTML template loading.**

```javascript
// Current: Each setting section requires separate async HTML template loads
async function getLlmAdvancedOptionsTemplate() {
    if (!llmAdvancedOptionsTemplate) {
        llmAdvancedOptionsTemplate = await loadHtmlTemplate('...');
    }
    return llmAdvancedOptionsTemplate;
}
// ... repeated 5+ times for different templates
```

**Problems:**
- 5 separate HTML template loads, each async, each cached manually
- Settings UI has collapsible groups, provider-specific sections, reasoning tools, MCP controls
- Uses `htmlTemplateLoader.js` utilities when simple JS template literals would work
- Many settings are provider-specific but all loaded regardless

**Recommendation:**
1. **Replace HTML templates with JS template literals** — removes async dependency
2. **Simplify settings to core values only**: temperature, top_p, max_tokens, system prompt
3. **Remove provider-specific option sections** — use a single "Advanced" expandable section
4. **Remove reasoning tools/MCP controls** from default settings (YAGNI)
5. **Expected result:** ~200 lines, 80% reduction

#### 1d. `llmGenerationHandler.js` — 1,055 lines
**The generation logic is buried under excessive UI state management.**

**Problems:**
- Handles send, stop, copy, copy-to-node, copy-from-node all in one function
- Phase-based UI updates (loading-model → generating → complete) are over-engineered
- Error handling has its own dialog system (`errorDialogOpen`, `lastErrorDialogMessage`)
- Vision mode adds another ~200 lines of branching logic
- History management mixed into generation flow

**Recommendation:**
1. **Split into separate concerns:**
   - `generationCore.js` — actual API calls and streaming (~150 lines)
   - `generationUI.js` — UI state updates during generation (~200 lines)
   - `generationHistory.js` — conversation history management (~150 lines)
2. **Simplify phase system** — two states is enough: idle/generating
3. **Move error dialogs to shared dialogManager**
4. **Expected result:** 3 files of ~150-200 lines each

#### 1e. `llmModelSelection.js` — 318 lines
**Reasonable size but has unnecessary complexity.**

**Problems:**
- Handles model loading, preset loading, capability detection
- Has its own dropdown rendering logic
- Provider/model state management mixed with UI

**Recommendation:**
1. **Extract provider/model state to shared `llmProviders.js`**
2. **Use existing dropdown components from `formElements.js`**
3. **Expected result:** ~150 lines

#### 1f. `llmTabShell.js` — 953 lines
**The orchestrator is too large.**

**Problems:**
- Subtab navigation system (~100 lines) could use existing tabs component
- Expansion scaffolds ("Coming Soon" placeholders) add visual noise
- Multiple localStorage key management functions
- Creates all sections inline instead of delegating

**Recommendation:**
1. **Use existing `components/tabs.js`** for subtab navigation
2. **Remove expansion scaffolds** — either implement features or remove them
3. **Consolidate localStorage helpers** into one utility
4. **Expected result:** ~400 lines

#### 1g. `llmHistorySection.js` — 573 lines
**Conversation history UI is over-engineered.**

**Problems:**
- Handles message rendering, conversation list, new chat button
- Has its own markdown rendering
- Message actions (copy, edit) inline with rendering

**Recommendation:**
1. **Use shared markdown utility** (`shared/markdown.js`)
2. **Simplify message rendering** — one format is enough
3. **Expected result:** ~250 lines

#### 1h. `llmVisionSection.js` — 441 lines
**Image upload/preview for vision mode.**

**Problems:**
- Drag-and-drop, file picker, preview grid, clear all — all in one file
- Has its own image loading logic when `shared/imageUtils.js` exists

**Recommendation:**
1. **Use shared image utilities**
2. **Simplify drag-and-drop** — basic file input is sufficient
3. **Expected result:** ~150 lines

#### 1i. `llmResponseSection.js` — 286 lines
**Response display with streaming.**

**Problems:**
- Handles response rendering, copying, streaming updates
- Has its own markdown rendering
- Phase badge system adds complexity

**Recommendation:**
1. **Use shared markdown utility**
2. **Simplify phase badges** to simple status text
3. **Expected result:** ~100 lines

#### 1j. `experimental/llmTabReactPilot.js` — 148 lines
**Dead code.** This is a React integration pilot that:
- Checks if React exists in the global scope
- Falls back to vanilla JS immediately
- Never actually used

**Recommendation:** **DELETE.** This adds maintenance burden for zero value.

### LLM Tab Summary

| File | Current Lines | Target Lines | Reduction |
|------|--------------|-------------|-----------|
| `llmEventHandlers.js` | 1,300 | 400 (split into 5 files) | -69% |
| `llmPresetDialogs.js` | 1,200+ | 300 | -75% |
| `llmAdvancedOptions.js` | 1,037 | 200 | -81% |
| `llmGenerationHandler.js` | 1,055 | 500 (split into 3) | -53% |
| `llmModelSelection.js` | 318 | 150 | -53% |
| `llmTabShell.js` | 953 | 400 | -58% |
| `llmHistorySection.js` | 573 | 250 | -56% |
| `llmVisionSection.js` | 441 | 150 | -66% |
| `llmResponseSection.js` | 286 | 100 | -65% |
| `experimental/...js` | 148 | **DELETE** | -100% |
| Other (partials, styles) | ~300 | ~100 | -67% |
| **Total** | **~9,500** | **~3,000** | **-68%** |

---

## 2. HIGH — Performance Tooling Over-Engineering

### Problem

Three files totaling **925 lines** of performance monitoring/diagnostics code that add complexity with minimal real-world value for end users.

#### 2a. `performanceDiagnostics.js` — 209 lines
**Overly aggressive monitoring with many unused features.**

**Problems:**
- Wraps `setTimeout`, `requestAnimationFrame`, and potentially `import()` globally
- Has a 35-second auto-report that fires regardless of user need
- Creates `window.SageUtilsPerformanceMonitor` — pollutes global namespace
- Many features (DOM readiness monitoring, network activity monitoring) are never used
- The "detect long sync operations" via setInterval is heavy-handed

**Recommendation:**
1. **Delete this file entirely.** Performance issues should be diagnosed with browser DevTools, not custom instrumentation.
2. If needed in the future, a simple `console.time()` wrapper is sufficient.
3. **Savings: 209 lines, removed global namespace pollution**

#### 2b. `performanceTimer.js` — 419 lines
**Excessive timing infrastructure.**

**Problems:**
- Two full `PerformanceTimer` class instances (javascript + UI)
- Browser performance observer setup with navigation/resource observers
- Function wrapping utilities (`wrapFunctionWithTiming`, `wrapObjectMethodsWithTiming`) that are never used
- Multiple export functions for trivial operations
- The `BrowserPerformanceObserver` class is 80+ lines of complexity

**Recommendation:**
1. **Keep only the core timing milestones** (record start/end/completion)
2. **Remove function wrapping utilities** — they're never called
3. **Remove BrowserPerformanceObserver** — use browser DevTools
4. **Expected result:** ~80 lines
5. **Savings: 339 lines**

#### 2c. `performanceUtils.js` — 297 lines
**Has useful utilities buried under over-engineering.**

**Problems:**
- Has `debounce`, `throttle`, `RateLimiter` — these are useful
- Also has `BatchProcessor`, `rafThrottle`, `memoize`, `lazy` — none of which are used
- RateLimiter is instantiated 3 times in crossTabMessaging but could be simpler

**Recommendation:**
1. **Keep only:** `debounce`, `throttle`, `RateLimiter`
2. **Remove:** `BatchProcessor`, `rafThrottle`, `memoize`, `lazy`
3. **Expected result:** ~100 lines
4. **Savings: 197 lines**

### Performance Tooling Summary

| File | Current Lines | Target Lines | Reduction |
|------|--------------|-------------|-----------|
| `performanceDiagnostics.js` | 209 | **DELETE** | -100% |
| `performanceTimer.js` | 419 | 80 | -81% |
| `performanceUtils.js` | 297 | 100 | -66% |
| **Total** | **925** | **180** | **-81%** |

---

## 3. HIGH — Cross-Tab Messaging Over-Engineering

### Problem

`crossTabMessaging.js` (330 lines) implements a pub-sub event bus with many message types that are rarely or never used.

#### 3a. Unused Message Types

The following message types are defined but **never consumed** by any subscriber:
- `llm-state-request` / `llm-state-response` — LLM state queries
- `image-queue-update` — image count notifications
- `llm-preset-applied` — preset application events

Only ~5 of the 12+ message types are actively used.

#### 3b. Rate Limiting Complexity

```javascript
// Current: Dynamic rate limiter setup with separate instances per type
this.rateLimiters.set('image-transfer', new RateLimiter(10, 1000));
this.rateLimiters.set('state-sync', new RateLimiter(20, 1000));
this.rateLimiters.set('notification', new RateLimiter(5, 1000));
```

The rate limiter is loaded dynamically via `import()` which adds async complexity. For the actual message types used (image-transfer, text-to-prompt-builder), simple throttling would suffice.

#### 3c. Helper Functions That Are Never Called

Many exported helper functions (`sendTextToLLM`, `requestTabSwitch`, etc.) are defined but only a few are actually called from other modules.

### Recommendation

1. **Remove unused message types** — delete the definitions and any code that creates them
2. **Simplify rate limiting** — use a single global RateLimiter with per-type counters, or just use `throttle()` from performanceUtils
3. **Keep only actively used helpers**
4. **Expected result:** ~100 lines
5. **Savings: 230 lines**

---

## 4. MEDIUM — State Management Over-Engineering

### Problem

`stateManager.js` (558 lines) provides centralized state management with localStorage persistence, JSDoc type definitions, and change tracking.

#### 4a. Unnecessary Complexity

**Problems:**
- Full JSDoc `@typedef` definitions for every state shape — adds maintenance burden
- localStorage persistence for sidebar state — most users don't care about this
- Change tracking with "dirty" flags for everything
- The state tree is deep and complex (models → filters, gallery → fullImageView, etc.)

#### 4b. localStorage Persistence

The project persists:
- Active tab
- Model selection state
- Gallery folder selection
- Prompt builder text

**Question:** Do users actually need this? Most ComfyUI workflows are one-shot. The sidebar is opened, used, and closed. Persisting state across sessions provides minimal value.

### Recommendation

1. **Remove localStorage persistence entirely** — keep state in memory only
2. **Simplify the state shape** — flatten nested structures
3. **Remove JSDoc typedefs** — inline comments are sufficient for this codebase
4. **Keep a simple getState/setState pattern** without the subscribe/selectors complexity
5. **Expected result:** ~100 lines
6. **Savings: 458 lines**

---

## 5. MEDIUM — Data Cache Over-Engineering

### Problem

`dataCache.js` (604 lines) implements a full TTL-based caching system with size limits, staleness tracking, and preloading.

#### 5a. Over-Engineered for Use Case

The cache stores:
- `cacheHash` — model hash data
- `cacheInfo` — model info
- `galleryImages:*` — image lists
- `llmModels:*` — LLM model lists
- `settings` — settings

These are **5 keys total**, and most change infrequently. The TTL system (30s for output gallery, 5min for settings, etc.) is overkill.

#### 5b. Unnecessary Features

**Problems:**
- `maxCacheSize: 50 * 1024 * 1024` — 50MB limit that's never hit
- `CacheStatus` enum with PENDING/LOADING/READY/ERROR/STALE — too many states
- `preloadAll()` with complex dependency tracking
- Per-key TTL configuration
- Staleness detection

### Recommendation

1. **Simplify to a basic in-memory cache** with optional TTL
2. **Remove size limits** — 5 keys won't hit memory constraints
3. **Remove staleness tracking** — just re-fetch when needed
4. **Keep preloading but simplify it** — just fetch all on init
5. **Expected result:** ~100 lines
6. **Savings: 504 lines**

---

## 6. MEDIUM — HTML Template Loading Pattern

### Problem

Multiple files use an HTML template loading pattern that adds async complexity:

```javascript
// Pattern used in llmAdvancedOptions.js, llmModelSelection.js, etc.
async function getTemplate() {
    if (!template) {
        template = await loadHtmlTemplate('extensions/comfyui_sageutils/...');
    }
    return template;
}

async function render() {
    const template = await getTemplate();
    return createElementFromTemplate(template);
}
```

This pattern appears in:
- `llmAdvancedOptions.js` — 5 template loads
- `llmModelSelection.js` — 2 template loads
- `galleryComponents.js` — multiple template loads
- Various component files

#### Problems:
1. **Async everywhere** — every render is async, forcing async up the entire call chain
2. **Manual caching** — each file implements its own template cache
3. **Template format mismatch** — HTML templates don't support dynamic content well
4. **File fragmentation** — HTML scattered across `.html` files makes code harder to follow

### Recommendation

1. **Replace HTML templates with JS template literals** for simple cases
2. **Keep HTML templates only for complex, static markup** (like gallery empty states)
3. **Centralize template loading** in one utility with a single cache
4. **Use `innerHTML` sparingly** — prefer DOM API for dynamic content

### Impact

This change would touch ~10 files and reduce async complexity throughout the LLM tab. The total line savings from removing template boilerplate would be ~100-150 lines, but the **architectural benefit** (removing async from render paths) is worth far more.

---

## 7. MEDIUM — Python Backend Route Duplication

### Problem

The routes system (`routes/`) has **~6,775 lines across 12 files** with significant pattern duplication.

#### 7a. Boilerplate in Every Route File

Every route file follows the same pattern:
```python
def register_routes(routes_instance):
    global _route_list
    _route_list.clear()
    
    @routes_instance.get('/sage_utils/endpoint')
    @route_error_handler
    async def handler(request):
        try:
            ...
            return web.json_response({"success": True, "data": ...})
        except Exception as e:
            return error_response(str(e))
    
    return len(_route_list)
```

This is 15-20 lines of boilerplate per route.

#### 7b. `base.py` is Over-Engineered

`routes/base.py` (433 lines) provides:
- `@route_error_handler` — useful but simple
- `@validate_json_body` — useful
- `@validate_query_params` — rarely used
- `@validate_file_path` / `get_secure_path` — path traversal protection
- Multiple response helper functions
- `SecurityError` exception

**Problems:**
- Many utilities are never used by route files
- The file is longer than most individual route files

### Recommendation

1. **Create a route decorator that handles registration + error handling in one step:**
   ```python
   @register_route('/sage_utils/endpoint', method='GET')
   async def handler(request):
       ...
       return {"data": ...}  # No need for web.json_response
   ```

2. **Simplify `base.py`** — remove unused validators and response helpers

3. **Expected savings: ~200 lines across routes, plus reduced boilerplate**

---

## 8. LOW — Python Model Cache Over-Engineering

### Problem

`utils/model_cache.py` (655 lines) implements a persistent cache with:
- Backup manifest system
- Batch mode with configurable thresholds
- Multiple backup files
- Content hashing for comparison
- 7-backup retention policy

#### Problems:
- The backup system is complex and rarely triggered
- Content hashing of entire cache data on every backup is expensive
- Most users never need this level of cache protection

### Recommendation

1. **Simplify to basic save/load with auto-backup** (1 backup, no manifest)
2. **Remove content hashing** — file modification time is sufficient
3. **Keep batch mode** but simplify thresholds
4. **Expected result:** ~300 lines
5. **Savings: 355 lines**

---

## 9. LOW — Python LLM Service Over-Engineering

### Problem

`utils/llm/service.py` (661 lines) has:
- Provider registry with descriptors
- Global state synchronization between legacy globals and registry
- Retry logic with configurable intervals
- Provider capability caching
- Multiple abstraction layers

#### Problems:
- The `ProviderRegistry` adds indirection for what is essentially 3 providers
- `_sync_registry_from_legacy_globals()` / `_sync_legacy_globals_from_registry()` — bidirectional sync is a code smell
- Many methods are thin wrappers that add no value

### Recommendation

1. **Simplify provider registration** — direct function calls instead of descriptor pattern
2. **Remove bidirectional sync** — pick one source of truth
3. **Keep retry logic** but simplify
4. **Expected result:** ~300 lines
5. **Savings: 361 lines**

---

## 10. LOW — Unused/Dead Code Audit

### Files to Delete Entirely

| File | Lines | Reason |
|------|-------|--------|
| `js/sidebar/llmTab/experimental/llmTabReactPilot.js` | 148 | Never used, dead code |
| `js/shared/performanceDiagnostics.js` | 209 | Aggressive monitoring, never used |
| `js/docs/Sage_CacheMaintenance.md` | ~100 | Obsolete documentation in JS folder |
| `docs/LLM_FOLDER_REFACTOR_PLAN.md` | ~150 | Superseded by current implementation |
| `docs/LOGGING_IMPROVEMENT_PLAN.md` | ~100 | Implementation completed, plan obsolete |
| `docs/PYDANTIC_MIGRATION_PLAN.md` | ~100 | Migration done, plan obsolete |
| `docs/SIDEBAR_CSS_EXTRACTION_PLAN.md` | ~100 | Plan obsolete |
| `docs/COMPONENT_CSS_MIGRATION_PLAN.md` | ~100 | Plan obsolete |
| `docs/DATASET_TEXT_MANAGER_REFACTOR_PLAN.md` | ~100 | Refactor done or abandoned |
| `docs/MODEL_CACHE_REVAMP_PROPOSALS.md` | ~150 | Superseded by current cache |
| `docs/LLM_PRESET_API.md` | ~100 | API evolved, doc obsolete |
| `docs/LLM_PROVIDER_STREAMING_ROLLOUT_PLAN.md` | ~100 | Rollout done, plan obsolete |
| `docs/LLM_REASONING_TOOLS_MCP_PLAN.md` | ~150 | Feature not implemented, plan dead |
| `docs/LLM_TAB_REDESIGN_OPTIONS.md` | ~200 | Design decisions made, options obsolete |
| `docs/NODE_SIDEBAR_INTEGRATION_IDEAS.md` | ~100 | Ideas never implemented |
| `docs/OPTION2_LLM_REACT_PILOT_PLAN.md` | ~150 | React pilot abandoned |
| `docs/SIDEBAR_IMPLEMENTATION_REVIEW.md` | ~100 | Review done, document obsolete |
| `docs/UTILS_FOLDER_REVIEW_2026-04-04.md` | ~100 | Review done, document obsolete |
| `docs/UTILS_IMPORT_POLICY.md` | ~50 | Policy set, reminder obsolete |
| `INLINE_HTML_REFACTOR_SUMMARY.md` | ~100 | Refactor done, summary obsolete |
| `JS_MESSAGING_EVENTS_QUEUE_REVIEW.md` | ~100 | Review done, document obsolete |
| **Total** | **~3,000** | |

### Functions to Remove

| Location | Function | Reason |
|----------|----------|--------|
| `performanceUtils.js` | `BatchProcessor` class | Never used |
| `performanceUtils.js` | `rafThrottle()` | Never used |
| `performanceUtils.js` | `memoize()` | Never used |
| `performanceUtils.js` | `lazy()` | Never used |
| `performanceTimer.js` | `wrapFunctionWithTiming()` | Never called |
| `performanceTimer.js` | `wrapObjectMethodsWithTiming()` | Never called |
| `performanceTimer.js` | `BrowserPerformanceObserver` class | Never used |
| `crossTabMessaging.js` | Unused message types | 5+ unused types defined |
| `crossTabMessaging.js` | Unused helper functions | ~8 helpers never called |
| `utils/llm/compat.py` | Entire file | 4 lines, likely unused |
| `routes/base.py` | `validate_query_params` decorator | Never used by routes |
| `routes/base.py` | `SecurityError` class | Not raised anywhere |

---

## Summary of Potential Savings

| Category | Current Lines | Target Lines | Reduction |
|----------|--------------|-------------|-----------|
| **LLM Tab** | ~9,500 | ~3,000 | -68% |
| **Performance Tooling** | ~925 | ~180 | -81% |
| **Cross-Tab Messaging** | ~330 | ~100 | -70% |
| **State Management** | ~558 | ~100 | -82% |
| **Data Cache** | ~604 | ~100 | -83% |
| **HTML Template Pattern** | ~300 (boilerplate) | ~100 | -67% |
| **Python Routes** | ~6,775 | ~5,000 | -26% |
| **Python Model Cache** | ~655 | ~300 | -54% |
| **Python LLM Service** | ~661 | ~300 | -55% |
| **Dead Code (files)** | ~3,000 | **DELETE** | -100% |
| **Dead Code (functions)** | ~500 | **DELETE** | -100% |
| **TOTAL** | **~33,000** | **~19,000** | **-42%** |

---

## Recommended Refactoring Order

## Completed Phases

### Phase 1: Quick Wins ✅ COMPLETE
- **Deleted:** `js/sidebar/llmTab/experimental/llmTabReactPilot.js` (148 lines) — never used, React pilot abandoned
- **Deleted:** `js/shared/performanceDiagnostics.js` (209 lines) — aggressive monitoring, never imported
- **Simplified:** `js/shared/performanceUtils.js` (297 → 120 lines, -177) — removed BatchProcessor, rafThrottle(), memoize(), lazy()
- **Simplified:** `js/shared/performanceTimer.js` (419 → 207 lines, -212) — removed wrapFunctionWithTiming, wrapObjectMethodsWithTiming, BrowserPerformanceObserver
- **Simplified:** `js/shared/crossTabMessaging.js` (330 → 133 lines, -197) — removed unused MessageTypes and rate limiter complexity
- **Simplified:** `routes/base.py` (433 → 97 lines, -336) — removed SecurityError, get_secure_path, validate_file_path, format_api_response, get_file_info, format_file_size
- **Simplified:** `routes/__init__.py` (244 → 228 lines, -16) — removed dead exports
- **Total removed: ~971 lines**

### Phase 2: Simplify Core Systems ✅ COMPLETE
- **Simplified:** `js/shared/stateManager.js` (558 → 475 lines, -83) — removed resetState() function (never called outside stateManager)
- **Simplified:** `js/shared/dataCache.js` (604 → 529 lines, -75) — removed clear() and resetMetrics() methods (never called anywhere)
- **Total removed: ~158 lines**

### Phase 3: LLM Tab Restructure ⏳ PENDING
- Split `llmEventHandlers.js` into focused modules
- Simplify `llmAdvancedOptions.js` — remove HTML templates, reduce settings
- Simplify `llmPresetDialogs.js` — cut manage dialog complexity
- Replace HTML templates with template literals where possible

### Phase 4: Python Backend Cleanup ⏳ PENDING
- Simplify route registration
- Simplify `model_cache.py`
- Simplify `llm/service.py`

### Phase 5: Ongoing Maintenance ⏳ PENDING
- Establish file size limits
- Regular dead code audits

---

## Recommended Refactoring Order
1. **Delete dead code files** — 20+ documentation plans and the React pilot
2. **Remove unused functions** from `performanceUtils.js` and `crossTabMessaging.js`
3. **Simplify `base.py`** in routes — remove unused utilities
4. **Expected effort:** 1-2 days
5. **Risk:** Zero — pure deletion

### Phase 2: Simplify Core Systems
1. **Delete `performanceDiagnostics.js`** entirely
2. **Simplify `performanceTimer.js`** — keep only milestones
3. **Remove localStorage persistence from `stateManager.js`**
4. **Simplify `dataCache.js`** — basic in-memory cache
5. **Expected effort:** 3-5 days
6. **Risk:** Low — behavior unchanged for end users

### Phase 3: LLM Tab Restructure
1. **Delete `experimental/llmTabReactPilot.js`**
2. **Split `llmEventHandlers.js`** into focused modules
3. **Simplify `llmAdvancedOptions.js`** — remove HTML templates, reduce settings
4. **Simplify `llmPresetDialogs.js`** — cut manage dialog complexity
5. **Replace HTML templates with template literals** where possible
6. **Expected effort:** 1-2 weeks
7. **Risk:** Medium — requires testing all LLM tab functionality

### Phase 4: Python Backend Cleanup
1. **Simplify route registration** — reduce boilerplate
2. **Simplify `model_cache.py`** — remove backup manifest complexity
3. **Simplify `llm/service.py`** — reduce abstraction layers
4. **Expected effort:** 3-5 days
5. **Risk:** Low — backend changes don't affect frontend

### Phase 5: Ongoing Maintenance
1. **Establish file size limits** (e.g., no file > 300 lines without justification)
2. **Require PR review for files > 500 lines**
3. **Document architectural decisions** instead of planning documents
4. **Regular dead code audits**

---

## Guiding Principles for Future Development

1. **One file, one concern.** If a file has multiple distinct responsibilities, split it.
2. **No more than 2 levels of abstraction.** If you need to read through 3 files to understand what one function does, the abstraction is too deep.
3. **Prefer simple functions over complex classes.** A 50-line function is easier to understand and test than a 200-line class with 10 methods.
4. **Don't build features until they're needed.** The React pilot, MCP tool support, and reasoning tools are examples of YAGNI — code written for features that may never be used.
5. **Reuse existing components.** Many parts of the LLM tab reinvent UI patterns that already exist in `components/`.
6. **Prefer sync over async.** Every async function adds complexity to the call chain. Only use async when necessary (network, file I/O).
7. **Comments explain why, code explains what.** If you need a 10-line comment to explain what code does, refactor the code instead.

---

## Appendix: File Size Distribution

### Largest Files (>500 lines)

| File | Lines | Category |
|------|-------|----------|
| `routes/llm_routes.py` | 2,143 | Python routes |
| `routes/gallery_routes.py` | 1,255 | Python routes |
| `utils/llm/service.py` | 661 | Python LLM backend |
| `utils/model_cache.py` | 655 | Python cache |
| `js/sidebar/llmTab/shared/llmEventHandlers.js` | 1,300 | JS LLM tab |
| `js/sidebar/llmTab/shared/llmPresetDialogs.js` | 1,200+ | JS LLM tab |
| `js/sidebar/llmTab/settings/llmAdvancedOptions.js` | 1,037 | JS LLM tab |
| `js/sidebar/llmTab/compose/llmGenerationHandler.js` | 1,055 | JS LLM tab |
| `js/sidebar/llmTab/llmTabShell.js` | 953 | JS LLM tab |
| `js/shared/dataCache.js` | 604 | JS shared |
| `js/shared/stateManager.js` | 558 | JS shared |
| `js/sidebar/llmTab/chat/llmHistorySection.js` | 573 | JS LLM tab |
| `routes/base.py` | 433 | Python routes |
| `routes/scanning_routes.py` | 472 | Python routes |
| `utils/llm/routes_helpers.py` | 792 | Python LLM backend |
| `js/llm/llmSettings.js` | 721 | JS LLM client |
| `js/llm/llmPresets.js` | 477 | JS LLM client |
| `js/llm/llmApi.js` | 499 | JS LLM client |
| `routes/tag_routes.py` | 480 | Python routes |
| `utils/performance_timer.py` | 308 | Python utils |
| `routes/cache_routes.py` | 397 | Python routes |
| `js/sidebar/llmTab/styles/llmStyles.css` | 1,834 | CSS |
| `js/shared/performanceTimer.js` | 419 | JS shared |
| `utils/settings.py` | 270 | Python utils |
| `routes/wildcard_routes.py` | 326 | Python routes |
| `js/llm/llmProviders.js` | 356 | JS LLM client |
| `js/sidebar/llmTab/shared/llmModelSelection.js` | 318 | JS LLM tab |
| `routes/notes_routes.py` | 357 | Python routes |
| `routes/prompt_storage_routes.py` | 355 | Python routes |
| `js/sidebar/cacheSidebar.js` | 970 | JS sidebar |
| `js/shared/crossTabMessaging.js` | 330 | JS shared |
| `utils/llm/providers/ollama/tools.py` | 443 | Python LLM provider |
| `routes/__init__.py` | 244 | Python routes |
| `utils/performance_fix.py` | 218 | Python utils |
| `utils/model_info.py` | 218 | Python utils |
| `js/sidebar/llmTab/compose/llmVisionSection.js` | 441 | JS LLM tab |
| `js/sidebar/llmTab/compose/llmResponseSection.js` | 286 | JS LLM tab |
| `utils/llm/providers/openai/client.py` | 409 | Python LLM provider |
| `utils/llm/providers/lmstudio/client.py` | 478 | Python LLM provider |
| `utils/llm/providers/ollama/client.py` | 527 | Python LLM provider |

### Files That Should Never Exceed 300 Lines

Any file exceeding 300 lines should be reviewed for:
- Can it be split into smaller, focused modules?
- Is there unnecessary abstraction or indirection?
- Are there unused features that can be removed?
