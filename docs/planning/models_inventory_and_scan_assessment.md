# Models Inventory and Metadata Scan Assessment

## Scope

This assessment covers the model inventory, the two JSON cache files, the Models
sidebar, folder discovery, hashing, and Civitai metadata scanning. The main code
paths reviewed were:

- `utils/path_manager.py` and `utils/model_cache.py`
- `utils/model_discovery.py`, `utils/file_utils.py`, and `utils/model_metadata.py`
- `routes/cache_routes.py` and `routes/scanning_routes.py`
- `js/sidebar/modelsTabV2.js`, `js/file/modelBrowser.js`, and `js/dialogs/modelScanDialog.js`

Civitai behavior was checked against the official [API reference](https://developer.civitai.com/site/reference/)
and [model versions reference](https://developer.civitai.com/site/reference/model-versions).

## Current Design

### Persistent data

SageUtils stores user data in ComfyUI's user directory, normally:

`user/default/SageUtils/sage_cache_hash.json`

`user/default/SageUtils/sage_cache_info.json`

The repository-level `SageUtils/` entry is a local symbolic link to that runtime
location for convenience; it is not a committed source of cache data and should
not be treated as part of the plugin's portable data model.

The data model is split into two indexes:

```text
sage_cache_hash.json: path -> short SHA-256 hash
sage_cache_info.json: hash -> metadata and Civitai information
```

Multiple paths with identical content can therefore share one metadata record.
The cache also keeps backups and writes JSON atomically.

### Models tab inventory

The Models tab fetches only `/sage_cache/hash` and `/sage_cache/info`. It does not
ask ComfyUI's `folder_paths` registry for a live file list and does not scan the
filesystem while rendering the tab. It then:

1. Builds one browser row for each cached path.
2. Deduplicates rows by hash, retaining one path for duplicate content.
3. Applies search, folder-name, last-used, update, and sort filters in the browser.

Therefore the tab currently shows cached model paths, not all models installed on
disk. A newly downloaded model is invisible until a scan or another code path adds
it to the cache. A deleted or moved model can remain visible indefinitely because
there is no reconciliation pass when the tab loads.

The browser's folder classification is also narrower than ComfyUI's registry. It
recognizes checkpoints, loras, embeddings, vae, and controlnet, but returns
`other` for unet/diffusion models and clip/text encoders. The header's folder
filter consequently cannot reliably represent the model families the scan claims
to support.

### Scan flow

The scan dialog first calls `GET /sage_cache/scan_model_folders`. The backend
groups selected filesystem locations into checkpoints, loras, vae, text encoders,
and diffusion models, counts files by SageUtils' extension set, and returns the
paths to the dialog.

On start, the dialog sends selected paths, `force`, `include_cached`, and a rate
limit value to `POST /sage_cache/scan_model_folders`. The backend then:

1. Recursively finds files with `MODEL_FILE_EXTENSIONS`.
2. Removes duplicate path strings.
3. Skips cached entries marked `blacklist` unless `force` is enabled.
4. Calls `pull_metadata` once per file.
5. Hashes uncached files and queries Civitai by hash when metadata is needed.
6. Saves the cache in batch mode, with periodic checkpoint saves.

`pull_metadata` skips a successful Civitai result for seven days, retries by
cached version ID when a hash lookup fails, and marks a model as blacklisted when
Civitai reports that the model/version does not exist. The Civitai calls are
currently made through public `GET` endpoints under
`https://civitai.com/api/v1`.

## Findings

### High priority

#### 1. The sidebar has no live inventory or stale-entry reconciliation

The Models tab is cache-backed rather than filesystem-backed. This explains why
it may not contain all installed models. It also means that removed files remain
in the two JSON indexes, and paths that have been replaced can retain old hashes
until a forced scan happens.

This is the largest product ambiguity: the UI presents a model browser, but the
actual source is a historical metadata cache.

#### 2. `include_cached` is collected but ignored

The dialog exposes "Include models already in cache" and sends
`include_cached`, but `background_scan_task` never uses the argument. Both modes
currently discover the same files and rely only on the seven-day Civitai skip in
`pull_metadata`.

The option should either be implemented as a real selection rule or removed. A
useful interpretation is:

- unchecked: process only new paths, changed files, or entries with missing
  metadata;
- checked: process all selected paths, subject to normal freshness rules;
- force: ignore freshness and retry all selected paths.

#### 3. The rate-limit control has no effect

The dialog collects `rateLimitDelay`, but the value is never sent in a way that
the backend consumes and no delay is applied between Civitai requests. A scan can
therefore issue sequential requests at the fixed behavior of the metadata helper,
not the user-selected interval. This is misleading and can increase rate-limit
failures.

Rate limiting belongs in the backend job, where it can cover both hash lookup and
fallback version lookup. It should also support retry-after responses and
exponential backoff. The official reference documents public caching headers for
public endpoints, so response caching can reduce repeated lookups, but it must
not be treated as a substitute for job-level throttling.

#### 4. Cancellation can be reported as completion

Cancellation sets the shared `active` flag to false. The worker breaks out of its
loop, saves the batch, and then unconditionally writes `status: completed`. The
polling dialog can consequently show a successful completion after a cancel
request. A worker-owned cancellation state or explicit terminal-state check is
needed before publishing the final status.

#### 5. A completed scan does not refresh the Models tab

`onScanComplete` is constructed with an empty callback in `modelsTabV2.js`. The
dialog finishes, but the tab does not refetch `/sage_cache/hash` and
`/sage_cache/info` or call `loadModels()`. New or updated entries are therefore
not visible until the user manually refreshes or recreates the tab.

## Medium priority

#### 6. Folder coverage is incomplete and inconsistent

ComfyUI defines more model families than the scan endpoint exposes, including
embeddings, clip vision, style models, upscale models, hypernetworks, GLIGEN,
photomaker, audio and other specialized registries. The scan currently omits
many of these. It also uses custom aliases such as `text_encoders`, `clip`,
`diffusion_models`, and `unet` in different places, while the browser infers
types from path substrings.

The source of truth should be ComfyUI's registered folder names and extensions.
SageUtils can group those registered names for display, but should not maintain a
second incomplete mapping.

#### 7. Filesystem verification is missing from cache reads

The cache endpoints return JSON mappings without checking whether each path is a
regular file, whether it still exists, or whether its current size and mtime
match the cached identity. The scan does find existing files, but it does not
remove stale cache entries. The browser has no state for missing, changed, or
unreadable files.

A reconciliation operation should classify entries as `present`, `missing`,
`changed`, or `unreadable`. It should not silently delete metadata; retention or
purging should be an explicit user action.

#### 8. The current hash representation is incompatible with efficient bulk lookup

`get_file_sha256` computes a full digest but returns only ten hexadecimal
characters. This increases collision risk and is not sufficient for Civitai's
bulk hash endpoint. The official API documents these relevant behaviors:

- `GET /model-versions/by-hash/{hash}` is public and accepts Civitai's recorded
  hash types, including `SHA256`, `BLAKE3`, `CRC32`, and AutoV1/2/3 values.
- `POST /model-versions/by-hash` accepts up to 100 hashes, but each hash must be
  a full 64-character SHA-256 value; unmatched hashes are omitted from the
  response.
- `POST /model-versions/by-hash/ids` accepts up to 10,000 full SHA-256 hashes
  when only model-version IDs are needed.
- A hash lookup returns 404 when no matching file is found or the file belongs
  to an unpublished version. A 404 is therefore not proof that the local file
  is corrupt or absent.

The current ten-character value is neither a full SHA-256 suitable for bulk
lookup nor a clearly labeled Civitai hash type. It may preserve compatibility
with older behavior, but it should not be used as the canonical identity for
new Civitai requests.

Do not rehash the existing library as a migration prerequisite. The existing
JSON files contain user-owned information that may no longer be recoverable
from Civitai, including manually edited fields and LoRA keywords for versions
that are no longer published. The migration must preserve both files and all
unknown fields, use atomic writes, and create a backup before any structural
change.

Use an additive, lazy migration:

1. Keep the current path-to-ten-character-hash mapping and hash-keyed metadata
  records readable exactly as they are.
2. Add optional per-path fingerprint fields, or a separate migration index, for
  `full_sha256`, file size, mtime, and hash timestamp. Do not replace the
  existing hash keys in place merely to upgrade their format.
3. For new files and files explicitly detected as changed, compute the full
  SHA-256 and put those files into a pending bulk-lookup batch.
4. Submit the full hashes in batches of at most 100 to Civitai's complete
  `/model-versions/by-hash` endpoint, then merge returned provider data into
  the existing records by path and current identity.
5. Process legacy short-hash entries individually only when their metadata is
  missing, stale, or explicitly requested. If a Civitai lookup is required,
  compute and store the full SHA-256 for that file at that point; do not assume
  the ten-character value is a valid SHA-256 API input.
6. Detect short-hash collisions before adding new records, and preserve the
  original legacy record if a collision or ambiguous migration is found.

This means a first migration pass can handle new and changed files efficiently
without spending days rehashing the existing library. Untouched legacy entries
remain available with their current metadata, and can be upgraded gradually as
they are used.

#### 9. Hash changes can leave orphaned metadata

When a file changes, `recheck_hash` copies the old info to the new hash, but the
old hash record is not removed when it no longer has a path. This can leave
unreferenced metadata and makes cache statistics differ from the live inventory.
The migration should be transactional: update the path identity, preserve both
the old provider record and all local fields, and record the new full hash
without deleting the old record. Garbage collection must be a separate,
explicitly requested operation with a preview, because an apparently orphaned
record may contain irreplaceable user annotations or may be needed by another
path not currently visible due to an incomplete inventory.

Provider refreshes must be field-scoped. They may update Civitai-owned fields
such as model version, base model, files, images, and provider status, but must
not replace local notes, favorites, blacklist decisions, custom tags, manually
entered trigger words, or unknown fields. Where ownership is currently
ambiguous, preserve the existing value and add the provider value under a
namespaced field rather than overwriting it.

#### 10. Metadata fields are not normalized

The backend writes `lastUsed`, while parts of the browser read `last_used`; it
writes `update_available`, while the item renderer checks `has_update`; and file
size is not consistently populated by the scan. This produces empty badges,
incorrect last-used displays, and sorting/filtering that differs between the
browser and reports.

Define one schema with canonical names, then normalize legacy records at the
cache boundary. In particular, distinguish `last_scanned`, `last_used`,
`file_size`, `mtime_ns`, `hash_algorithm`, `civitai_status`, and
`metadata_checked_at`.

### Lower priority and operational risks

- A successful `GET /model-versions/by-hash/{hash}` response already contains the
  version, model, files, hashes, and images. The client then performs a second
  `GET /models/{modelId}` request to determine the latest version. That second
  request is only needed for the optional update check, so it should be cached
  separately and refreshed less often than the file-hash match. The reference
  also notes that model-version stats are limited; use the model endpoint only
  when model-level data is actually required.
- Network errors and "not found" are mixed into the same general metadata
  failure flow. A temporary outage should not be treated like a permanent
  missing or unpublished Civitai version. Store a status such as
  `temporary_error`, `not_found_or_unpublished`, or `matched`, with retry
  timestamps and the HTTP status. Preserve the distinction between a local
  file's filesystem status and its Civitai publication status.
- The full model-version response includes `status`, `availability`, `model.mode`,
  `files`, and `downloadUrl`. Archived or taken-down resources can omit files or
  download URLs, so a successful HTTP response does not necessarily mean the
  resource is currently downloadable. Store these provider states explicitly.
- The scan uses one global progress object. It is adequate for one local UI but
  has no job ID, durable result summary, or per-file error list. A tab reload can
  lose useful scan context.
- File discovery uses recursive globbing and extension checks rather than a
  shared helper that explicitly excludes directories and symlink policy. The
  discovery result should be normalized to real files with a documented symlink
  policy.
- Cache load behavior depends on both split files being present. A missing or
  damaged one should produce a clear partial-cache repair path rather than
  silently falling back to the legacy cache branch.
- Full hashing of large models is inherently expensive. The cache should use
  size plus mtime as a cheap unchanged check, then hash only new or changed
  files, while retaining a full-hash verification option.

## Recommended Direction

### Current implementation status

The planned work has progressed beyond the original cache-only design. The
following slices are implemented and validated with focused regression tests:

- Scan selection, cancellation, progress counters, bounded error details, and
  post-scan Models tab refresh.
- Lazy per-path size/mtime fingerprints and read-only filesystem reconciliation.
- Explicit confirmed cleanup for missing/unreadable path mappings, preserving
  hash-keyed metadata.
- Conservative Civitai metadata merging that protects local and unknown fields.
- Elapsed-time-aware scan throttling, transient retry/backoff, `Retry-After`,
  bounded successful-response caching, and a shared elapsed-time-aware Civitai
  request gate.
- Additive full-SHA256 hashing and Civitai bulk lookup for new/changed files,
  while preserving legacy short-hash records, with cooperative per-file hashing
  progress.
- Provider outcome statuses, scan counters, retry actions, and separate Civitai
  status badges/filters.
- Registry-driven model-folder discovery, expanded folder filters, live
  inventory, stale records, duplicate-path rows, canonical inventory fields,
  category counts, and semantic scan-category selection.
- Durable scan history, scan-history UI, scan previews, and selectable scan
  profiles for all, new/changed, unmatched, and retryable files.

The current focused test suite has 27 passing tests at this stage. The remaining
work below is hardening and expansion, not a prerequisite for preserving the
existing cache data.

### Phase 1 implementation status

The first implementation slice now:

- preserves the existing split JSON cache and metadata records;
- records cheap, path-specific size and mtime fingerprints in a reserved
  metadata field without replacing existing fields;
- honors `include_cached` for uncached paths and cached paths whose fingerprint
  has changed;
- keeps cancellation active until the worker has saved its partial batch, then
  reports `cancelled` instead of overwriting it with `completed`;
- reports discovered, skipped, processed, and error counts; and
- refreshes the Models tab after a scan completes or is cancelled;
- exposes a read-only `/sage_cache/reconcile` endpoint that classifies cached
  paths as present, changed, missing, unreadable, or legacy-unknown;
- loads those filesystem statuses into the Models tab as transient row badges
  and filter options without writing status data into the existing cache.
- merges Civitai results conservatively: provider-owned fields refresh, while
  existing local, ambiguous, and unknown fields are preserved.
- forwards and enforces the scan dialog's rate-limit delay between metadata
  jobs, with backend validation and bounds.
- computes full SHA-256 only for new or changed files, performs Civitai bulk
  lookups in batches of 100, and retains the existing short-hash cache keys;
  failed bulk requests fall back to the existing individual path.
- records separate matched, unmatched, and temporary-error counters in scan
  progress and displays them in the scan dialog.
- retains up to 100 JSON-safe per-file or bulk-lookup error details in scan
  progress and logs each detail once in the scan dialog.
- isolates full-hash I/O failures per file, allowing the rest of the batch to
  continue while avoiding an immediate retry of the same failed file.
- displays Civitai provider status separately from filesystem status in the
  Models tab, with filters for matched, unmatched, temporary-error, and legacy
  not-checked records.
- provides a row-level retry action for temporary Civitai failures, forcing a
  fresh metadata lookup and refreshing the displayed provider status.
- discovers scan folders from ComfyUI's registered model-folder registry,
  retaining compatibility groups while including additional registered model
  categories and extra model paths.
- provides an explicit, confirmed cleanup action for missing or unreadable path
  mappings; cleanup does not delete the associated hash-keyed metadata.
- caches successful Civitai single and bulk hash responses for five minutes in a
  bounded process-local cache, with errors excluded and bulk keys normalized so
  request order does not create duplicate calls.
- exposes a read-only live inventory joined with registered folder types,
  existing cache metadata, filesystem status, and stale cached paths; the Models
  tab consumes it without hashing or mutating cache files.
- keeps duplicate-content files at different filesystem paths as separate live
  inventory rows, while aggregating duplicate registry references to one path;
  path-based row identities keep selection and actions unambiguous.
- displays live inventory counts for installed, changed, stale, missing,
  unreadable, and not-verified records in the Model Browser header.
- includes registered-category counts in the inventory response and exposes
  them through the Model Browser summary tooltip.
- provides a read-only scan preview estimating selected files, new/changed files,
  full hashes, bulk requests, and bytes to hash before starting a scan.
- supports scan profiles for all selected files, new/changed files, unmatched
  Civitai files, and retryable temporary failures; previews use the same profile
  selection rules as the actual scan.
- filters live inventory by canonical registered category and metadata status,
  including a distinct installed-but-not-scanned state.
- exposes non-destructive canonical metadata aliases at API boundaries, including
  `last_used`, `has_update`, `file_size`, and a schema-version marker, without
  rewriting legacy JSON records.
- writes `_sageutils_schema_version: 1` only when a record is newly created or
  refreshed, leaving untouched legacy records unchanged for future migration.
- persists the latest 20 scan summaries in a separate `sage_scan_history.json`
  file, including options, terminal status, counters, and bounded error details;
  history is available through `/sage_cache/scan_history`.
- coordinates uncached Civitai requests through a shared elapsed-time-aware gate,
  including nested fallback requests, while allowing cached responses through
  without an unnecessary delay.
- provides a Models tab History dialog for reviewing recent terminal summaries
  and per-scan errors after the scan dialog has closed or the sidebar reloads.
- performs full-hash preparation in cooperative chunks, keeping progress polling
  and cancellation responsive for large inventories.
- shows separate total-scan and current-file progress bars, with current-file
  phase feedback for hashing and metadata processing.
- completes each current-file hash at `100%` before yielding to the next file,
  rather than leaving the bar at the hashing milestone between files.

Legacy records without fingerprints remain legacy-unknown and are not rehashed
automatically. Missing and changed classifications do not mutate or delete
cache records; any cleanup or migration remains an explicit later operation.

The current rate limiter is intentionally job-level: it spaces metadata jobs in
the background scan and is bounded to 100-5000 milliseconds. This prevents a
fast scan from issuing back-to-back work, but does not yet provide exact spacing
between multiple Civitai requests made inside one metadata job, such as a hash
lookup followed by a version fallback. That finer-grained limiter remains a
follow-up for the Civitai request helper.

Full-hash batching is likewise additive. New or fingerprint-changed files store
their complete SHA-256 under a reserved metadata field while the existing
ten-character path hash remains the cache join key. Untouched legacy files are
not rehashed. Bulk matches skip the per-file Civitai lookup and latest-model
request; if a bulk request fails, those files use the existing individual
fallback instead.

Bulk lookup omissions are classified as `not_found_or_unpublished` rather than
being treated as successful matches. Request-level failures are counted as
temporary errors and remain eligible for the individual fallback path. The scan
dialog reports these categories separately from processing errors.

Civitai request helpers now retry transient HTTP statuses (429, 500, 502, 503,
and 504) and request exceptions up to a bounded number of attempts. They honor
numeric or HTTP-date `Retry-After` values before falling back to exponential
backoff. Permanent 404 responses are returned immediately so missing or
unpublished versions are not delayed or misclassified as temporary failures.

The current metadata merge protects `notes`, favorites, blacklist state, and
`trainedWords`, along with ambiguous legacy values such as `name`, `baseModel`,
and the nested model name/type. Existing unknown fields are also preserved. This
is intentionally conservative because older records do not identify whether a
top-level field came from Civitai or a user edit. A later schema migration can
add explicit field ownership markers without rewriting the existing records.

### Phase 1: Correctness and contract cleanup

1. **Complete.** Scan completion/cancellation states and result counters now
  cover discovered, skipped, processed, matched, unmatched, temporary errors,
  processing errors, and cancellation. Bounded per-file error details are also
  returned.
2. **Complete.** `include_cached` and the rate-limit setting are wired to the
  backend.
3. **Complete.** Cache data, reconciliation state, and the browser refresh after
  scans and retries.
4. **Complete.** Read-only reconciliation checks existence, regular-file status,
  size, and mtime, and the UI distinguishes stale records.
5. **Partially complete.** API responses now expose canonical aliases and a
  schema-version marker without rewriting legacy records. The Models browser,
  report sorting/formatting, and shared update detection now prefer those
  aliases while keeping legacy fallbacks. Persistent schema migration and any
  remaining consumer-specific cleanup and future schema migrations remain.
6. **Complete for current fields.** Provider updates are field-scoped and
  preserve local annotations and unknown fields. Explicit ownership markers
  remain a future schema improvement.
7. **Complete for the implemented slices.** Focused tests cover scan options,
  cancellation, stale/changed files, hashing failures, bulk lookup, retries,
  metadata preservation, cleanup, and live inventory.

### Phase 2: Use ComfyUI as the inventory authority

**In progress.** The first read-only inventory slice is implemented. It uses
ComfyUI's registered folders, joins live files with cached metadata, preserves
stale records, keeps duplicate paths visible, and reports inventory counts.
The scan dialog now selects registered category names and the backend resolves
those names against the current ComfyUI configuration. The remaining work is to
make the inventory schema fully canonical.

The inventory records now include canonical `exists`, `is_file`, `size`,
`mtime_ns`, and `metadata_status` fields alongside the compatibility fields used
by the current Models tab. Category selection is registry-based and scan
previews use the same profile filtering rules as actual scans.

Create one backend inventory function that enumerates ComfyUI's registered model
folders and extensions. Return records containing:

```text
path, registered_types, exists, is_file, size, mtime_ns,
hash, metadata_status, metadata
```

The Models tab should consume this inventory and join optional metadata by hash.
This makes an unscanned installed file visible immediately, while clearly
labeling it as "not scanned" rather than pretending it has no metadata.

The scan dialog should select registered model categories, not serialized absolute
paths. The backend can resolve category names against the current ComfyUI
configuration, including extra model paths and custom-node registrations.

### Phase 3: Efficient metadata jobs

**Partially complete.** Lazy fingerprints, additive full hashes, bulk lookup,
retry/backoff, elapsed-time-aware throttling, shared request coordination, and
process-local response caching are implemented. Durable scan history is also
implemented. Persistent Civitai response caching and durable per-file history
remain future work.

- Maintain a small persistent per-file fingerprint: legacy hash if present, full
  SHA-256 when available, size, mtime, and hash timestamp.
- Do not eagerly rehash all existing entries. Use size plus mtime as a cheap
  unchanged check, retain the old short-hash identity for untouched records, and
  compute the full SHA-256 lazily for new/changed files or selected migration
  jobs. A full-hash verification action can handle files whose mtime behavior is
  unreliable.
- Run full-hash work for new and changed files first, collect those results, and
  perform the Civitai bulk lookup before starting legacy individual work. This
  keeps the expensive work bounded and makes the scan useful early.
- Process untouched legacy entries individually after the batch, and only when
  the selected scan profile requires them. A legacy entry with valid current
  metadata should not be hashed again solely for format migration.
- Use a bounded worker queue with one shared rate limiter for Civitai calls.
- Cache Civitai responses by full hash and model/version ID. Batch full SHA-256
  lookups in groups of at most 100 when complete version objects are needed, or
  at most 10,000 when only IDs are needed.
- Retry temporary failures with backoff and honor `Retry-After`.
- Keep user metadata edits separate from provider metadata so a refresh cannot
  overwrite local notes, favorites, blacklist state, trigger words, or tags.
- Write changes through a copy-on-write/atomic update path and retain a backup
  of both JSON files before migration or bulk updates. A failed batch must not
  leave the hash and info indexes out of sync.
- Add an explicit "retry failed" and "clear stale entries" action.
- Keep the migration path fully non-destructive: canonical aliases are additive,
  legacy keys remain readable, and JSON cache writes are atomic and backup-aware
  before any ownership cleanup is attempted.

### Phase 4: Final migration and consumer cleanup

**Ready for rollout once explicit migration is requested.** The compatibility
layer now prefers canonical keys without rewriting legacy JSON records, and the
core cache save path preserves hash/info pair integrity during failed writes.
The remaining follow-up is to document and enforce the final consumer cleanup:

- prefer canonical `metadata_status`, `registered_types`, `exists`, `is_file`,
  `size`, `mtime_ns`, and `last_used` everywhere in the Models tab and reports;
- keep legacy aliases as read-only fallbacks while the migration remains
  opt-in and backward compatible;
- keep all JSON updates copy-on-write and atomic, with explicit backups before
  any bulk ownership or field cleanup; and
- only migrate records after a user-triggered or admin-approved step so a
  legacy cache can be upgraded without a risky in-place rewrite.

### Phase 4: Better model management features

- Show inventory counts by category: installed, scanned, matched, unmatched,
  stale, and missing.
- Add filters for metadata status and filesystem status.
- Show duplicate content groups without hiding the additional paths; allow the
  user to inspect every installed location.
- Add a dry-run scan preview with estimated hashing time and Civitai requests.
- Support scan profiles such as all models, new/changed only, selected categories,
  unmatched only, and failed-only retry.
- Export/import cache data with schema version and validation.

## Suggested Acceptance Tests

1. Put a supported model in a registered ComfyUI folder without scanning it. The
   Models tab shows it as installed and not scanned.
2. Remove a cached file and reconcile. The entry is marked missing and is not
   silently presented as available.
3. Change a file in place. Reconciliation detects the changed fingerprint and a
   scan creates a new identity without orphaning the old record.
4. Run a scan with `include_cached=false`. Fresh cached files are skipped while
   new and changed files are processed.
5. Set a short test rate limit and verify request timestamps respect it.
6. Cancel a scan during processing. The final state remains cancelled and the
   partial results are persisted.
7. Complete a scan. The Models tab refreshes without a sidebar reload.
8. Simulate Civitai timeout, rate-limit, and not-found responses. Each receives a
   distinct status and retry policy.
9. Verify all ComfyUI registered model categories appear in inventory and filters.
10. Verify duplicate-content files remain individually inspectable while sharing
    provider metadata.
11. Verify legacy ten-character cache entries remain readable without forcing a
    whole-library rehash, while a newly scanned file uses a full SHA-256 for
    Civitai bulk lookup.
12. Verify a Civitai 404, unpublished version, archived model, and taken-down
    model are distinguishable from a missing local file.
13. Seed a cache record with custom notes, favorite/blacklist state, trigger
    words, unknown fields, and provider data, then refresh it. All local and
    unknown fields survive unchanged.
14. Run a migration against a large legacy cache and verify only new or changed
    files are hashed before the first bulk request; untouched legacy files are
    not rehashed.

## Bottom Line

The current system is a useful metadata cache and Civitai lookup workflow, but it
is not yet a complete model inventory. The safest near-term improvement is to
separate live filesystem inventory from cached metadata, then make the scan a
controlled enrichment job over that inventory. Civitai's current API makes full
SHA-256 valuable for efficient bulk matching, but the existing short-hash cache
means that migration must be lazy and additive. That resolves the missing-model
ambiguity and enables reliable deleted/changed-file detection without forcing a
long, disruptive rehash of the existing library. New and changed files should
be hashed first and looked up in bulk; untouched legacy records should be
processed individually only when needed. Existing JSON data, including
non-replaceable local annotations, must remain intact throughout.