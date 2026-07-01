# Sage Utils ComfyUI Custom Node Development Guide

## Project Overview
ComfyUI custom node providing utilities for model management, prompting, metadata handling, and workflow enhancement.

Refer to `okf/developer/project_overview.md` for the project directory layout and key asset locations.

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

**File Organization:**
Refer to `okf/architecture/backend_js_architecture.md` for frontend JavaScript structure and sidebar organization.

**Code Structure Guidelines:**
- Prefer multiple shorter files (refactor when approaching 1000 lines)
- Maximize code reuse through modular design
- Create generic UI components for reusability across different contexts
- Maintain clear separation between frontend and backend code
- Split long functions into smaller, focused functions
- Use composition over inheritance for component design

**JavaScript Validation:**
Always validate JavaScript files after making large changes using Node.js syntax checking:
- Single file: `node -c path/to/file.js`
- All JS files: `find js -name "*.js" -exec node -c {} \; && echo "All files valid"`
- Specific directory: `find js/sidebar -name "*.js" -exec node -c {} \;`
This catches syntax errors, missing imports, and basic structural issues before testing in ComfyUI.

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

**OKF Documentation Guidance:**
- Treat `okf/` as the primary structured documentation bundle for this project.
- When adding or changing architecture, developer, UI, node, example, or docs content, create or update the corresponding `okf/*/index.md` and concept files.
- Update `okf/*/log.md` for the bundle(s) affected by your changes.
- Prefer pointing from legacy docs and README files to the OKF bundle when stable guidance already exists there.
- If information belongs in the project reference docs, move it into the OKF bundle and use a short redirect/reference in legacy docs rather than duplicating the full content.
- Keep the OKF indexes current: add new concept links to the right subbundle index and keep the bundle root (`okf/index.md`) aligned with new content.

**Directory Documentation Maintenance:**
- Each directory containing README.md files must be kept up to date when making changes.
- When adding, removing, or modifying files in a directory, update the corresponding README.md or add a short pointer to the relevant `okf/` concept.
- Key directories with documentation that require maintenance:
  - `js/` - Main JavaScript overview and directory structure
  - `js/shared/` - Shared utilities and infrastructure documentation
  - `js/nodes/` - Node implementation system documentation
  - `js/components/` - Component display system documentation
  - `js/sidebar/` - Sidebar functionality documentation
- Prefer linking to `okf/` where the same information is already maintained in a structured concept.
- Update file listings, function descriptions, and architectural notes to reflect changes.
- Remove references to deleted files and add documentation for new files.
- Maintain consistency in formatting and terminology across all README files.

## Domain Knowledge References
- [ComfyUI Custom Node Documentation](https://docs.comfy.org/custom-nodes/overview)
- [ComfyUI GitHub Repository](https://github.com/comfyanonymous/ComfyUI)
- [ComfyUI Frontend Repository](https://github.com/Comfy-Org/ComfyUI_frontend)

**Local Documentation (docs/ref_docs/):**
- `docs/ref_docs/overview.md` - Overview of all documentation links and status
- `docs/ref_docs/backend/` - Backend development documentation
- `docs/ref_docs/frontend/` - Frontend JavaScript development documentation
- `docs/ref_docs/extra/` - Additional resources (workflow templates, tips)

The content in `docs/ref_docs/` is largely imported and converted from the official ComfyUI docs at `https://docs.comfy.org/` and the upstream repository `https://github.com/Comfy-Org/docs.git`.
Depending on when the import was last run, `docs/ref_docs/` may be out of date with the live official docs.

Key Local Documentation Files:
- `docs/ref_docs/backend/walkthrough.md` - Complete node development walkthrough
- `docs/ref_docs/backend/server_overview.md` - Server architecture and components
- `docs/ref_docs/backend/datatypes.md` - Data types and type handling
- `docs/ref_docs/backend/lifecycle.md` - Node lifecycle and execution flow
- `docs/ref_docs/frontend/javascript_overview.md` - JavaScript development overview
- `docs/ref_docs/frontend/javascript_hooks.md` - Hook system and lifecycle
- `docs/ref_docs/frontend/javascript_settings.md` - Settings API and configuration
- `docs/ref_docs/extra/workflow_templates.md` - Workflow template system
- `docs/ref_docs/extra/tips.md` - Development tips and best practices

**OKF Note:** When an `okf/` concept already covers a topic, prefer linking to that concept from legacy docs and README files instead of duplicating the content.

**Character Encoding:** Use only standard ASCII characters - no Unicode symbols, smart quotes, or emojis.