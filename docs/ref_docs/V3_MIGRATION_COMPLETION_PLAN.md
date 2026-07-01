# V3 Migration Completion Plan

This plan targets finishing the V3 migration so all V3 nodes are fully implemented and ready for manual testing and cutover.

## Phase 1: Audit & Status

- Inventory V3 files: `conditioning_v3.py`, `custom_io_v3.py`, `image_v3.py`, `llm_v3.py`, `loader_v3.py`, `metadata_v3.py`, `sampler_v3.py`, `selector_v3.py`, `text_v3.py`, `training_v3.py`, `util_v3.py`, and `nodes_v3.py`.
- Incomplete indicators found (via TODO markers): `text_v3.py`, `training_v3.py`, `util_v3.py`.
- Confirm remaining V3 files have complete `define_schema()` and `execute()` implementations without placeholders.

## Phase 2: Parity Mapping (per node)

- Map each V1 node to its V3 class:
  - Inputs: ensure 1:1 coverage from `INPUT_TYPES` to `io.Schema.inputs`.
  - Outputs: ensure parity for `RETURN_TYPES`/`RETURN_NAMES` to `io.Schema.outputs`.
  - Node properties: `CATEGORY`, `OUTPUT_NODE`, `DEPRECATED`, `EXPERIMENTAL` → corresponding `Schema` fields.
- Identify special behaviors and port them:
  - Validation → `validate_inputs(cls, **kwargs)`.
  - Lazy evaluation → `check_lazy_status(cls, ...)`.
  - Cache/fingerprint → `fingerprint_inputs(cls, **kwargs)`.
  - UI previews/output behaviors using `ui.*` helpers.

## Phase 3: Implement Missing Logic

- `text_v3.py`: Replace remaining TODO blocks with full logic from `text.py` (prompt/wildcard handling, concatenation, cleaning, selection, and any Lumina-specific prompt/system nodes). Keep input names stable to minimize downstream changes.
- `util_v3.py`: Fill in all utility node logic (string ops, list ops, conditionals, and helpers) mirroring `util.py`, ensuring correct types and optional inputs.
- `training_v3.py`: Port training-related nodes from `training.py`, including schemas, execution, and any side-effect/output node semantics.
- Avoid superficial fixes: ensure correct behavior, data types, and error handling match V1 semantics or documented improvements.

## Phase 4: Registration & Dependencies

- Ensure every implemented class is exported in the module-level lists consumed by `nodes_v3.py` (`TEXT_NODES`, `UTIL_NODES`, `TRAINING_NODES`, etc.).
- Verify `SageExtension.get_node_list()` returns the complete `NODE_LIST`.
- Cross-check that deprecated/intentionally dropped V1 nodes are either marked `is_deprecated=True` or excluded with rationale.

## Phase 5: Validation Checks (per node)

- Schema completeness: `node_id`, `display_name`, `category`, `inputs`, `outputs`, flags (`is_output_node`, `is_deprecated`, `is_experimental`).
- Execute contract: returns `io.NodeOutput(...)` with correctly typed outputs; optional `ui` previews where relevant.
- Special methods present and correct (only when needed).
- Fingerprinting correctness for cache-sensitive nodes (e.g., loaders).
- Consistency: input/output names remain stable across V1→V3 when feasible.

## Phase 6: Quick Sanity Tests

- Minimal harness per module: construct representative inputs and invoke `execute()` to verify type correctness and core behavior.
- Smoke-test example workflows that rely on text/util/training nodes; verify graphs execute without placeholder paths.

## Phase 7: Manual Testing Checklist

- For each node:
  - Confirm UI renders expected inputs/outputs and tooltips.
  - Validate edge cases (empty strings, None/optional inputs, boundary numeric values).
  - Confirm lazy evaluation and fingerprinting behave as intended.
  - Confirm output nodes expose `run` behavior appropriately.

## Phase 8: Cutover Readiness

- When all nodes in `NODE_LIST` pass validation and manual checks, enable V3 loading flow and begin broader workflow testing.
- Document any intentional behavior differences vs V1 in module docstrings or project docs.

## Prioritization Guidance

- Highest priority: `text_v3.py`, `util_v3.py` (widely used); then `training_v3.py`.
- Validate `loader_v3.py`, `image_v3.py`, `sampler_v3.py`, `conditioning_v3.py`, `llm_v3.py`, `metadata_v3.py`, `selector_v3.py`, `custom_io_v3.py` for completeness.

## Acceptance Criteria (Definition of Done)

- All V3 nodes implement complete `define_schema()` and `execute()` without TODOs/placeholders.
- Special methods present where applicable and tested.
- Nodes included in `NODE_LIST`; deprecated nodes flagged appropriately.
- Example workflows execute end-to-end using V3 nodes.
- Documented differences from V1 where behavior changes are intentional.
