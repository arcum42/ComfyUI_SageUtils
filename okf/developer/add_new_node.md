---
type: Guide
title: Add a New Node
description: Step-by-step guidance for adding a new ComfyUI v3 node to Sage Utils.
resource: Unsloth_Project_Docs.md
tags: [developer, node, okf]
timestamp: 2026-07-01T00:00:00Z
---

This concept documents how to add a new ComfyUI v3 node to Sage Utils.

## Steps

1. Define a custom I/O type in `nodes/custom_io_v3.py` if needed.
2. Add a new node class in the appropriate `nodes/*_v3.py` file.
3. Implement `define_schema()` with inputs, outputs, and metadata.
4. Implement `execute(**kwargs)` to build the node output or graph.
5. If the node creates sub-graphs, use `GraphBuilder`.
6. Import the node in `nodes/__init__.py` if required.
7. Add tests for node schema and execution.

## Example

```python
class Sage_MyNode(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_MyNode",
            display_name="My Node",
            description="Description of this node.",
            category=f"{SAGE_UTILS_CAT}/my_category",
            inputs=[...],
            outputs=[...]
        )

    @classmethod
    def execute(cls, **kwargs):
        # Build result or graph
        ...
```

## Notes

- Prefer structured custom types for node inputs and outputs.
- Keep new nodes consistent with existing ComfyUI v3 conventions.
