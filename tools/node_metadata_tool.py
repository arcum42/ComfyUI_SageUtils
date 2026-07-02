from __future__ import annotations

from pathlib import Path
from typing import Any

# Usage:
#   cd /home/ai/programs/comfyui
#   ./venv/bin/python -c "import os, sys; root=os.path.abspath('.'); sys.path.insert(0, os.path.join(root, 'custom_nodes')); sys.path.insert(0, root); from comfyui_sageutils.tools.node_metadata_tool import regenerate_node_docs; written = regenerate_node_docs(); print(len(written))"
#   ./venv/bin/python -c "import os, sys; root=os.path.abspath('.'); sys.path.insert(0, os.path.join(root, 'custom_nodes')); sys.path.insert(0, root); from comfyui_sageutils.tools.node_metadata_tool import regenerate_node_docs; written = regenerate_node_docs(node_ids=['Sage_LoadImage']); print(written)"

DEFAULT_TEMPLATE = """---
type: NodeDoc
title: {{display_name}}
description: Auto-generated node documentation.
tags: [nodes, docs]
---

# {{display_name}}

* **Node ID:** `{{node_id}}`
* **Category:** `{{category}}`

{{description}}

## Inputs

{{inputs}}

## Outputs

{{outputs}}

## Notes

{{notes}}

Generated from the node schema.
"""


def _import_io_module() -> Any:
    import comfy_api.latest as io
    return io


def _import_node_list() -> list[type[Any]]:
    from ..nodes_v3 import NODE_LIST
    return NODE_LIST


def _normalize_io_type(io_item: Any) -> str:
    if io_item is None:
        return "unknown"
    if hasattr(io_item, "get_io_type"):
        return str(io_item.get_io_type())
    return str(getattr(io_item, "io_type", type(io_item).__name__))


def _normalize_inputs(inputs: list[Any]) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    for input_item in inputs or []:
        if hasattr(input_item, "get_all"):
            for item in input_item.get_all() or []:
                normalized.append(_normalize_input(item))
        else:
            normalized.append(_normalize_input(input_item))
    return normalized


def _normalize_input(input_item: Any) -> dict[str, Any]:
    return {
        "name": getattr(input_item, "id", ""),
        "display_name": getattr(input_item, "display_name", ""),
        "type": _normalize_io_type(input_item),
        "description": getattr(input_item, "tooltip", "") or "",
        "optional": getattr(input_item, "optional", False),
    }


def _normalize_output(output_item: Any) -> dict[str, Any]:
    return {
        "name": getattr(output_item, "id", ""),
        "display_name": getattr(output_item, "display_name", ""),
        "type": _normalize_io_type(output_item),
        "description": getattr(output_item, "tooltip", "") or "",
        "is_output_list": getattr(output_item, "is_output_list", False),
    }


def _normalize_schema(schema: Any) -> dict[str, Any]:
    return {
        "node_id": getattr(schema, "node_id", None) or "",
        "display_name": getattr(schema, "display_name", None) or "",
        "description": getattr(schema, "description", None) or "",
        "category": getattr(schema, "category", None) or "",
        "notes": getattr(schema, "notes", ""),
        "inputs": _normalize_inputs(getattr(schema, "inputs", []) or []),
        "outputs": [_normalize_output(item) for item in getattr(schema, "outputs", []) or []],
    }


def _build_node_record(node_class: type[Any]) -> dict[str, Any]:
    node_id = getattr(node_class, "__name__", "")
    schema = None
    try:
        schema = node_class.define_schema()
    except Exception:
        schema = None

    if schema is None:
        return {
            "node_id": node_id,
            "display_name": node_id,
            "description": "",
            "category": "",
            "inputs": [],
            "outputs": [],
        }

    record = _normalize_schema(schema)
    if not record["node_id"]:
        record["node_id"] = node_id
    if not record["display_name"]:
        record["display_name"] = node_id
    return record


def list_nodes() -> list[dict[str, str]]:
    """Return a shallow list of Sage Utils nodes."""
    records = get_node_metadata()
    return [
        {
            "node_id": record["node_id"],
            "display_name": record["display_name"] or record["node_id"],
        }
        for record in records
    ]


def _render_template(template: str, data: dict[str, Any]) -> str:
    rendered = template
    for key, value in data.items():
        if isinstance(value, str):
            rendered = rendered.replace(f"{{{{{key}}}}}", value)
    return rendered


def _render_list_section(items: list[dict[str, Any]], section_name: str) -> str:
    if not items:
        return f"## {section_name}\n\n_No {section_name.lower()} defined._\n"

    rendered_items: list[str] = []
    for item in items:
        title = f"### `{item['name']}` — `{item['type']}`"
        if item.get("optional", False):
            title += " (optional)"

        lines = [title]
        if item.get("display_name"):
            lines.append(f"- **Name:** `{item['display_name']}`")
        description = item.get("description", "")
        if description:
            lines.append(f"- **Description:** {description}")
        if item.get("is_output_list", False):
            lines.append("- **List output:** True")

        rendered_items.append("\n".join(lines))

    return "\n\n".join(rendered_items) + "\n"


def _render_node_doc(template: str, record: dict[str, Any]) -> str:
    rendered = template
    # replace simple fields
    for key in ["node_id", "display_name", "description", "category", "notes"]:
        rendered = rendered.replace(f"{{{{{key}}}}}", str(record.get(key, "")))

    # render lists
    inputs_section = _render_list_section(record.get("inputs", []), "Inputs")
    outputs_section = _render_list_section(record.get("outputs", []), "Outputs")

    rendered = rendered.replace("{{inputs}}", inputs_section)
    rendered = rendered.replace("{{outputs}}", outputs_section)
    return rendered


def render_node_doc(node_id: str, template: str | None = None) -> str:
    template = template or DEFAULT_TEMPLATE
    record = get_node_metadata([node_id])
    if not record:
        raise ValueError(f"Node not found: {node_id}")
    return _render_node_doc(template, record[0])


def write_node_doc(node_id: str, target_dir: str, template: str | None = None) -> Path:
    content = render_node_doc(node_id, template)
    target_path = Path(target_dir) / f"{node_id}.md"
    target_path.write_text(content, encoding="utf-8")
    return target_path


def regenerate_node_docs(node_ids: list[str] | None = None, target_dir: str | None = None, template: str | None = None) -> list[Path]:
    """Regenerate node documentation for all or selected Sage Utils nodes."""
    output_dir = Path(target_dir or Path(__file__).resolve().parent.parent / "js" / "docs")
    output_dir.mkdir(parents=True, exist_ok=True)
    if node_ids is None:
        node_ids = [record["node_id"] for record in get_node_metadata()]

    written: list[Path] = []
    for node_id in node_ids:
        written.append(write_node_doc(node_id, str(output_dir), template))
    return written


def get_node_metadata(node_ids: list[str] | None = None) -> list[dict[str, Any]]:
    """Return full metadata for requested Sage Utils nodes or all nodes."""
    node_list = _import_node_list()
    records = [_build_node_record(node_class) for node_class in node_list]
    if node_ids is None:
        return records

    requested = set(node_ids)
    return [record for record in records if record["node_id"] in requested]
