# Sage Utils Custom Node Instructions for Copilot

## Purpose
These instructions define coding standards, directory structure, and domain knowledge for developing and maintaining the Sage Utils custom node for ComfyUI. They are optimized for AI coding assistants (e.g., Copilot) to ensure consistency and best practices.

## Project Overview
- **Project:** Sage Utils custom node for [ComfyUI](https://github.com/comfyanonymous/ComfyUI)
- **Documentation:** https://docs.comfy.org/
- **Main directory:** `comfyui_sageutils` (located in `comfyui/custom_nodes/`)

## Directory and File Roles
- `__init__.py`: Entry point for ComfyUI to load the custom node. Contains node mappings, descriptions, and JS file locations.
- `nodes/`: All node class definitions for Sage Utils custom node (grouped by function, e.g., model nodes in `model.py`).
- `utils/`: Utility/helper functions.
- `pyproject.toml`: Defines the custom node set for ComfyUI's registry. **Update when releasing a new version.**
- `README.md`: Project information. **Update with new features or changes.**
- `js/`: JavaScript files for frontend integration.
- `example_workflows/`: Example workflow files and images. For each example, include a JSON file with the workflow and a JPG file with a thumbnail image.

## Coding Standards

### Python Coding Standards
#### Naming
- Use `snake_case` for function and variable names.
- Use `PascalCase` for class names.
- Use `ALL_CAPS` for constants and mapping names.

#### Formatting
- Use four spaces for indentation.
- Use blank lines to separate class and function definitions.
- Use f-strings for string formatting.

#### Structure
- Group related node classes in the appropriate module (e.g., model nodes in `nodes/model.py`).
- Place all node class definitions in `comfyui_sageutils.nodes`.
- Place utility/helper functions in `comfyui_sageutils.utils`.

#### Documentation
- Each node class should have a docstring describing its purpose and inputs/outputs.

#### Typing and Error Handling
- Use type hints and return type annotations where possible.
- Use try/except blocks for error handling, especially around I/O and network operations.
- Use tuple unpacking for return values when returning multiple outputs.
- Ignore type errors in `__init__.py` for the `comfyui_sageutils` module to avoid issues with ComfyUI's dynamic loading. While IO.* types are normally used, custom types are defined by passing a string in the tuple in the inputs or outputs.
- A new v3 API is in development, but not yet available. See #fetch: https://blog.comfy.org/p/dependency-resolution-and-custom .

#### Coding Practices
- Use list comprehensions for creating lists from iterables.
- Use generator expressions for large datasets to save memory.
- Use context managers (`with` statements) for file operations to ensure proper resource management.
- Follow idiomatic Python practices, such as using `enumerate()` for loops when both index and value are needed.
- Code should be modular and reusable, with functions and classes designed for single responsibilities.
- Code should be clean and well-optimized, avoiding unnecessary complexity.
- Code should be pythonic, following the Zen of Python principles (PEP 20).

### JavaScript Coding Standards
#### Naming
- Use `camelCase` for variable and function names.
- Use `PascalCase` for class and constructor names.
- Use `ALL_CAPS` (with underscores) for constants.

#### Formatting
- Use two spaces for indentation.
- Use semicolons at the end of statements.
- Use single quotes for strings unless double quotes are required.
- Use blank lines to separate logical sections of code.
- Keep lines under 100 characters when possible.

#### Structure
- Group related functions and classes together.
- Place all frontend integration code in the `js/` directory.
- Use ES6 modules (`import`/`export`) where possible.
- Prefer arrow functions for short callbacks and anonymous functions.

#### Documentation
- Use JSDoc-style comments for functions, classes, and complex logic.
- Each exported function or class should have a comment describing its purpose and usage.

#### Typing and Error Handling
- Use explicit checks for types and null/undefined where appropriate.
- Use try/catch for error handling around asynchronous or risky operations.
- Prefer `const` and `let` over `var` for variable declarations.

#### Coding Practices
- Use array methods (`map`, `filter`, `reduce`) for working with collections.
- Avoid mutating function arguments.
- Use template literals for string interpolation.
- Keep functions small and focused on a single responsibility.
- Avoid global variables; encapsulate logic in modules or classes.
- Use strict equality (`===` and `!==`).
- Write modular, reusable code.

### Character Encoding and Symbols
- Use only standard ASCII characters in all code, comments, and documentation.
- Do not use Unicode symbols, em dashes (—), smart quotes (“ ” ‘ ’), ellipses (…), or emojis.
- Use only regular hyphens (-), straight quotes (' and "), and three periods (...) for ellipsis if needed.

## Documentation and Versioning
- **Update `README.md`** with any new features or changes.
- **Update `pyproject.toml`** when releasing a new version.

## Domain Knowledge and References
- Follow best practices and patterns from the official [ComfyUI custom node documentation](https://docs.comfy.org/custom-nodes/overview) and [ComfyUI GitHub repository](https://github.com/comfyanonymous/ComfyUI).
- See also:
    - #fetch https://docs.comfy.org/custom-nodes/walkthrough
    - #fetch https://docs.comfy.org/custom-nodes/backend/server_overview
    - #fetch https://docs.comfy.org/custom-nodes/backend/lifecycle
    - #fetch https://docs.comfy.org/custom-nodes/backend/datatypes
    - #fetch https://docs.comfy.org/custom-nodes/backend/images_and_masks
    - #fetch https://docs.comfy.org/custom-nodes/backend/more_on_inputs
    - #fetch https://docs.comfy.org/custom-nodes/backend/lazy_evaluation
    - #fetch https://docs.comfy.org/custom-nodes/backend/expansion
    - #fetch https://docs.comfy.org/custom-nodes/backend/lists
    - #fetch https://docs.comfy.org/custom-nodes/backend/snippets
    - #fetch https://docs.comfy.org/custom-nodes/backend/tensors
    - #fetch https://docs.comfy.org/custom-nodes/help_page
    - #fetch https://docs.comfy.org/custom-nodes/js/javascript_overview
    - #fetch https://docs.comfy.org/custom-nodes/js/javascript_hooks
    - #fetch https://docs.comfy.org/custom-nodes/js/javascript_objects_and_hijacking
    - #fetch https://docs.comfy.org/custom-nodes/js/javascript_settings
    - #fetch https://docs.comfy.org/custom-nodes/js/javascript_dialog
    - #fetch https://docs.comfy.org/custom-nodes/js/javascript_toast
    - #fetch https://docs.comfy.org/custom-nodes/js/javascript_about_panel_badges
    - #fetch https://docs.comfy.org/custom-nodes/js/javascript_bottom_panel_tabs
    - #fetch https://docs.comfy.org/custom-nodes/js/javascript_sidebar_tabs
    - #fetch https://docs.comfy.org/custom-nodes/js/javascript_commands_keybindings
    - #fetch https://docs.comfy.org/custom-nodes/js/javascript_topbar_menu
    - #fetch https://docs.comfy.org/custom-nodes/js/javascript_examples
    - #fetch https://docs.comfy.org/custom-nodes/workflow_templates
    - #fetch https://docs.comfy.org/custom-nodes/tips
- Related repositories:
    - #fetch https://github.com/comfyanonymous/ComfyUI
    - #fetch https://github.com/Comfy-Org/ComfyUI_frontend

---
**Note:** Always follow the latest best practices from the official documentation and repositories. When in doubt, refer to the provided links or ask for clarification.