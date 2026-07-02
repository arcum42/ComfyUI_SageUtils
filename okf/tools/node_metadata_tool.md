---
type: Guide
title: Node Metadata Extraction Tool
description: Documentation for the Sage Utils node metadata extraction tool.
tags: [okf, tools, nodes, docs]
timestamp: 2026-07-01T00:00:00Z
---

# Node Metadata Extraction Tool

This tool extracts Sage Utils node metadata from the existing `nodes/` implementation.

## Purpose

The tool provides a structured view of Sage Utils nodes for documentation generation and node reference purposes.

## What it returns

Each node record includes:

- `node_id`
- `display_name`
- `description`
- `category`
- `inputs` with `name`, `type`, and `description`
- `outputs` with `name`, `type`, and `description`

## Implementation notes

- The tool reads `NODE_LIST` from `nodes_v3.py`.
- It calls `define_schema()` on each node class.
- It normalizes the returned `io.Schema` object.
- It is intentionally separated from OKF documentation: the code lives in `tools/`, while documentation lives in `okf/tools/`.

## Planned API

- `list_nodes()` — returns a shallow list of node IDs and display names.
- `get_node_metadata(node_ids=None)` — returns full metadata for requested nodes or all nodes if `node_ids` is omitted.

## Usage

The tool will be useful for generating documentation skeletons, auditing node I/O, and creating an index of Sage Utils nodes.
