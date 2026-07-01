# Workflow Templates

## Summary

If you have example workflow files associated with your custom nodes then ComfyUI can show these to the user in the template browser (`Workflow`/`Browse Templates` menu). Workflow templates are a great way to support people getting started with your nodes.

## How It Works

All you have to do as a node developer is to create an `example_workflows` folder and place the `json` files there. Optionally you can place `jpg` files with the same name to be shown as the template thumbnail.

Under the hood ComfyUI statically serves these files along with an endpoint (`/api/workflow_templates`) that returns the collection of workflow templates.

## Accepted Folder Names

The following folder names are also accepted, but we still recommend using `example_workflows`:

- `workflow`
- `workflows`
- `example`
- `examples`

## Example Structure

Under `ComfyUI-MyCustomNodeModule/example_workflows/` directory:

```
My_example_workflow_1.json
My_example_workflow_1.jpg
My_example_workflow_2.json
```

In this example ComfyUI's template browser shows a category called `ComfyUI-MyCustomNodeModule` with two items, one of which has a thumbnail.

## Key Features

- **Automatic discovery**: ComfyUI automatically discovers workflow templates in the appropriate folders
- **Thumbnail support**: JPG files with matching names are used as thumbnails
- **Categorized display**: Templates are organized by custom node module name
- **Template browser integration**: Templates appear in the built-in template browser
- **Static serving**: Files are served directly without processing

## Best Practices

### File Organization

- Use the `example_workflows` folder name for consistency
- Name workflow files descriptively (e.g., `basic_text_to_image.json`)
- Provide thumbnails for visual reference
- Keep file names clean and readable

### Workflow Design

- Create workflows that showcase your node's capabilities
- Include clear examples of different use cases
- Use reasonable default values
- Document any required models or dependencies

### Thumbnails

- Use JPG format for thumbnails
- Match the exact filename (excluding extension)
- Choose representative images that show the workflow's output
- Keep file sizes reasonable for quick loading

## Usage Notes

- Templates are discovered automatically when ComfyUI starts
- The template browser shows templates organized by custom node module
- Users can load templates directly from the browser
- Templates help users understand how to use your custom nodes effectively
- No additional configuration is required beyond placing files in the correct folder
