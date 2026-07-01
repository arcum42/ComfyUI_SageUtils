---
type: Guide
title: Add a New Route
description: Step-by-step guidance for adding a new aiohttp route to Sage Utils.
resource: Unsloth_Project_Docs.md
tags: [developer, routes, okf]
timestamp: 2026-07-01T00:00:00Z
---

This concept documents the process for adding a new backend route to Sage Utils.

## Steps

1. Create a new route module in `routes/<name>_routes.py`.
2. Define `register_routes(routes_instance)` to attach route handlers.
3. Use `@route_error_handler` and validation decorators from `routes/base.py`.
4. Register the route module in `routes/__init__.py`.
5. Add tests for the new route behavior.

## Example

```python
def register_routes(routes_instance):
    @routes_instance.get('/sage_utils/my_endpoint')
    @route_error_handler
    async def my_endpoint(request):
        return success_response({'message': 'ok'})
    return 1
```

## Notes

- Prefer standard JSON response formats.
- Validate request parameters using decorators from `routes/base.py`.
- Keep route handlers small and delegate logic to helpers.
