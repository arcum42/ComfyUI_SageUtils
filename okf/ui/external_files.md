---
type: Guide
title: Loading External Files in Sidebar Tabs
description: How to load external CSS files for Sage Utils sidebar tabs and frontend extensions.
tags: [okf, ui, guide, css, sidebar]
timestamp: 2026-07-01T00:00:00Z
---

# Loading External Files from the JS Layer

Use the `js/` directory as the source for frontend assets served by Sage Utils. Files under `js/` are exposed to the browser as:

```text
extensions/comfyui_sageutils/<relative-path-under-js>
```

So a file stored at:

```text
js/sidebar/testSidebar.css
```

is referenced as:

```text
extensions/comfyui_sageutils/sidebar/testSidebar.css
```

## CSS and other static assets

For CSS and similar static files, load them from JS by creating a `<link>` tag or by using the built-in style loader helpers.

### Helper functions

- `loadSidebarStyle(styleId, href)` — creates and appends a `<link rel="stylesheet">` tag if it does not already exist.
- `loadSidebarStyles(styles)` — loads multiple sidebar styles by delegating to `loadSidebarStyle`.

Example:

```js
loadSidebarStyle('my-sidebar-style', 'extensions/comfyui_sageutils/sidebar/testSidebar.css');
```

## HTML templates

HTML partials and templates are loaded using the shared HTML template loader utilities.

### Helper functions

- `loadHtmlTemplate(templatePath)` — fetches an HTML template from the browser and caches the result.
- `renderHtmlTemplate(templateString, data)` — injects values into a template string using `{{ key }}` and `{{{ key }}}` syntax.
- `createElementFromTemplate(templateString, data)` — turns rendered HTML into DOM nodes.
- `loadAndCreateHtmlTemplate(templatePath, data)` — helper that loads a template and converts it to DOM nodes in one step.

Example:

```js
const template = await loadHtmlTemplate('extensions/comfyui_sageutils/sidebar/partials/myPartial.html');
const element = createElementFromTemplate(template, { title: 'Hello' });
container.appendChild(element);
```

## General guidance

- Do not include `js/` in the public URL path.
- Use `extensions/comfyui_sageutils/...` for files stored under `js/`.
- Prefer the shared loader helpers when loading HTML templates or CSS from the sidebar.
- Verify asset loading with browser dev tools if a file fails to load.
