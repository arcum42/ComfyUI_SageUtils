# JavaScript Toast API

## Summary

The Toast API provides a way to display non-blocking notification messages to users. These are useful for providing feedback without interrupting workflow.

## Basic Usage

### Simple Toast

Display a basic informational toast:

```javascript
// Display a simple info toast
app.extensionManager.toast.add({
  severity: "info",
  summary: "Information",
  detail: "Operation completed successfully",
  life: 3000
});
```

### Toast Types

Different severity levels provide appropriate styling and behavior:

```javascript
// Success toast
app.extensionManager.toast.add({
  severity: "success",
  summary: "Success",
  detail: "Data saved successfully",
  life: 3000
});

// Warning toast
app.extensionManager.toast.add({
  severity: "warn",
  summary: "Warning",
  detail: "This action may cause problems",
  life: 5000
});

// Error toast
app.extensionManager.toast.add({
  severity: "error",
  summary: "Error",
  detail: "Failed to process request",
  life: 5000
});
```

### Alert Helper

Shorthand method for creating quick alert messages:

```javascript
// Shorthand for creating an alert toast
app.extensionManager.toast.addAlert("This is an important message");
```

## API Reference

### Toast Message

```javascript
app.extensionManager.toast.add({
  severity?: "success" | "info" | "warn" | "error" | "secondary" | "contrast", // Message severity level (default: "info")
  summary?: string,         // Short title for the toast
  detail?: any,             // Detailed message content
  closable?: boolean,       // Whether user can close the toast (default: true)
  life?: number,            // Duration in milliseconds before auto-closing
  group?: string,           // Group identifier for managing related toasts
  styleClass?: any,         // Style class of the message
  contentStyleClass?: any   // Style class of the content
});
```

### Alert Helper

```javascript
app.extensionManager.toast.addAlert(message: string);
```

### Additional Methods

```javascript
// Remove a specific toast
app.extensionManager.toast.remove(toastMessage);

// Remove all toasts
app.extensionManager.toast.removeAll();
```

## Key Features

- **Non-blocking**: Toasts don't interrupt the user's workflow
- **Auto-dismiss**: Configurable auto-close timing
- **Severity levels**: Different visual styles for different message types
- **Closable**: Users can manually dismiss toasts
- **Grouping**: Related toasts can be managed together
- **Styling**: Customizable appearance through CSS classes

## Usage Notes

- Toast messages appear as temporary notifications in the UI
- The `life` parameter controls auto-dismiss timing (in milliseconds)
- Different severity levels provide appropriate visual feedback
- The `group` parameter allows managing related notifications together
- Use the alert helper for simple messages that don't need detailed configuration
