# Node Documentation Extraction Tool Plan

## Goal

Create a tool that extracts Sage Utils node metadata from the existing `nodes/` implementation and provides:

- `node_id`
- `display_name`
- `description`
- `category`
- `inputs` with descriptions
- `outputs` with descriptions

This tool will support two main use cases:

1. Pull a list of all Sage Utils nodes.
2. Pull detailed metadata for all Sage Utils nodes.

Later, the output can be used to generate documentation and node reference content.

## Background

The Sage Utils node implementation already exposes a complete node list in `nodes_v3.py`.

- `nodes_v3.py` imports all node modules from `nodes/*.py`
- Each node module defines a module-level array of node classes, such as `AUDIO_NODES`, `TEXT_NODES`, etc.
- `NODE_LIST` is built by concatenating those arrays.

Each node class includes a `define_schema` classmethod that returns an `io.Schema` object.
The schema contains the node I/O definitions and should be the authoritative source for node metadata.

## Scope

The planned tool should operate on the existing Python node definitions and not require manual metadata annotations outside the node classes.

### Inputs

- `nodes_v3.py` and its imported node modules
- `NODE_LIST`
- `node.define_schema()` return values

### Outputs

For each node, the tool should emit a structured object with:

- `node_id` — unique identifier for the node (class name or schema name)
- `display_name` — human-readable name if available
- `description` — node description or docstring from the schema
- `category` — node category if present on the schema
- `inputs` — list of input definitions with `name`, `type`, `description`, and fallback values where available
- `outputs` — list of output definitions with `name`, `type`, and `description`

## Proposed API

The tool should expose at least two actions:

1. `list_nodes()`
   - Returns the list of Sage Utils node IDs and display names.

2. `get_node_metadata(node_ids=None)`
   - Returns full metadata for the requested nodes.
   - If `node_ids` is omitted, return metadata for all nodes.

## Implementation Plan

1. Create a tool module in the Sage Utils codebase under `tools/node_metadata_tool.py`.
2. Document the tool in `okf/tools/` by adding an OKF concept entry in `okf/tools/index.md` and describing it in `okf/tools/available_tools.md`.
3. Import `NODE_LIST` from `nodes_v3.py`.
4. Iterate over `NODE_LIST` and inspect each node class.
5. Call `node.define_schema()` and normalize the returned `io.Schema` object:
   - extract `node_id`, `display_name`, `description`, and `category`
   - extract `inputs` and `outputs`
   - preserve input/output descriptions from the schema
6. Build a normalized metadata record for each node.
7. Return structured JSON/dictionary-friendly output.

## Implementation layout

The tool module should expose a small public API for extraction and support both list and metadata retrieval.

Suggested module shape:

```python
from .nodes_v3 import NODE_LIST
from comfy_api.latest import io


def list_nodes() -> list[dict[str, str]]:
    """Return a shallow list of all Sage Utils nodes."""


def get_node_metadata(node_ids: list[str] | None = None) -> list[dict[str, Any]]:
    """Return full metadata for the requested Sage Utils nodes."""
```

### Tool API contract

- `list_nodes()`
  - returns `[{'node_id': 'Sage_LoadImage', 'display_name': 'Load Image'}]`
- `get_node_metadata(node_ids=None)`
  - returns a list of node metadata objects for either the requested nodes or all nodes if none are supplied

A future wrapper can translate these functions into an AI-run tool interface or a CLI entrypoint.

## Extraction details

### Node list source

- `nodes_v3.py` is the single source of truth for available Sage Utils nodes.
- It already imports every node module and constructs `NODE_LIST`.

### Schema inspection

The tool should rely on the `define_schema()` result rather than parsing source files.
This preserves the runtime behavior of nodes and picks up any schema logic expressed in Python.

### Fallback behavior

If a node or schema is missing a field:

- use the class name as `node_id`
- use `title` or `name` as `display_name`
- allow empty `description`
- allow missing `category`

### Output format

Each node record should look like:

```json
{
  "node_id": "Sage_LoadImage",
  "display_name": "Load Image",
  "description": "Load an image from file or URL.",
  "category": "Image",
  "inputs": [
    {
      "name": "image_path",
      "type": "String",
      "description": "Path or URL of the image to load."
    }
  ],
  "outputs": [
    {
      "name": "image",
      "type": "Image",
      "description": "The loaded image tensor."
    }
  ]
}
```

## Next steps after the tool is available

1. Use the tool output to generate node documentation skeletons.
2. Map extracted metadata into `js/docs/` markdown templates.
3. Optionally add automation that updates or validates `js/docs/` content based on the extracted schema.

## Risks and open questions

- Some nodes may use schema metadata fields differently; the tool should be robust to missing data.
- If `define_schema()` performs side effects or requires backend resources, the extraction should be sandboxed or invoked in a read-only mode.
- If node names are dynamic or locale-specific, preserve both the class name and schema-provided name.

## Deliverables

- `docs/planning/node_documentation_tool_plan.md`
- A tool implementation in Sage Utils that returns node list and node metadata
- A stable JSON output format for downstream documentation generation
- A follow-up plan for markdown generation from extracted metadata
