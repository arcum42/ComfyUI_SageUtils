# Sage Utils ComfyUI Custom Node Development Guide

## Project Overview
ComfyUI custom node providing utilities for model management, prompting, metadata handling, and workflow enhancement.

**Key Directories:**
- `__init__.py`: Node registration and mappings
- `nodes/`: Node classes by category (model.py, text.py, image.py, llm.py, etc.)
- `utils/`: Shared utilities (cache, config, helpers, loaders)
- `js/`: Frontend components
- `assets/`: Configuration files (styles, prompts, settings)
- `example_workflows/`: Workflow demos with JSON + JPG pairs

## Python Standards
**Naming:** `snake_case` functions/variables, `PascalCase` classes, `ALL_CAPS` constants  
**Formatting:** 4-space indent, f-strings, type hints where possible  
**Structure:** Group nodes by function, utils for shared code  
**Error Handling:** Try/except for I/O, tuple unpacking for multiple returns  
**Best Practices:** List comprehensions, context managers, single responsibility

## JavaScript Standards  
**Naming:** `camelCase` variables/functions, `PascalCase` classes, `ALL_CAPS` constants  
**Formatting:** 2-space indent, semicolons, single quotes, ES6 modules  
**Best Practices:** Arrow functions, array methods, strict equality, template literals

## Node Development
- Place nodes in appropriate `nodes/*.py` module
- Each node class needs docstring with purpose/inputs/outputs
- Register in `__init__.py` CLASS_MAPPINGS and NODE_DISPLAY_NAME_MAPPINGS
- Custom types defined as strings in input/output tuples
- Use `comfyui_sageutils.utils` for shared functionality

**Type Errors to Ignore:**
- `INPUT_TYPES` will have type errors when using custom types as strings (e.g., `"IMAGE"`, `"MODEL"`)
- Lists and tuples in type definitions may not match IO.* types - this is expected ComfyUI behavior
- Do not attempt to "fix" these type errors as they are intentional for ComfyUI's dynamic type system

**Plugin Import Limitations:**
- This is a ComfyUI plugin/custom node, not a standalone project
- Test code may fail with import errors when run independently (outside ComfyUI context)
- Imports like `from comfy.comfy_types.node_typing import ComfyNodeABC` only work when loaded by ComfyUI
- Don't attempt to fix import errors in test files - they require ComfyUI's runtime environment

## Documentation Updates
- Update `README.md` for new features
- Update `pyproject.toml` version for releases
- Create workflow examples with JSON + JPG pairs

**Directory Documentation Maintenance:**
- Each directory containing README.md files must be kept up to date when making changes
- When adding, removing, or modifying files in a directory, update the corresponding README.md
- Key directories with documentation that require maintenance:
  - `js/` - Main JavaScript overview and directory structure
  - `js/shared/` - Shared utilities and infrastructure documentation
  - `js/nodes/` - Node implementation system documentation
  - `js/components/` - Component display system documentation
  - `js/sidebar/` - Sidebar functionality documentation
- Update file listings, function descriptions, and architectural notes to reflect changes
- Remove references to deleted files and add documentation for new files
- Maintain consistency in formatting and terminology across all README files

## Domain Knowledge References
- [ComfyUI Custom Node Documentation](https://docs.comfy.org/custom-nodes/overview)
- [ComfyUI GitHub Repository](https://github.com/comfyanonymous/ComfyUI)
- [ComfyUI Frontend Repository](https://github.com/Comfy-Org/ComfyUI_frontend)

**Local Documentation (ref_docs/):**
- `ref_docs/overview.md` - Overview of all documentation links and status
- `ref_docs/backend/` - Backend development documentation
- `ref_docs/frontend/` - Frontend JavaScript development documentation  
- `ref_docs/extra/` - Additional resources (workflow templates, tips)

Key Local Documentation Files:
- `ref_docs/backend/walkthrough.md` - Complete node development walkthrough
- `ref_docs/backend/server_overview.md` - Server architecture and components
- `ref_docs/backend/datatypes.md` - Data types and type handling
- `ref_docs/backend/lifecycle.md` - Node lifecycle and execution flow
- `ref_docs/frontend/javascript_overview.md` - JavaScript development overview
- `ref_docs/frontend/javascript_hooks.md` - Hook system and lifecycle
- `ref_docs/frontend/javascript_settings.md` - Settings API and configuration
- `ref_docs/extra/workflow_templates.md` - Workflow template system
- `ref_docs/extra/tips.md` - Development tips and best practices

**Character Encoding:** Use only standard ASCII characters - no Unicode symbols, smart quotes, or emojis.