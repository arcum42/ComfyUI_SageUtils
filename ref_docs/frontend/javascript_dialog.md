# JavaScript Dialog API

## Summary

The Dialog API provides standardized dialogs that work consistently across desktop and web environments. Extension authors will find the prompt and confirm methods most useful.

## Basic Usage

### Prompt Dialog

Shows a dialog asking for user input with a text field:

```javascript
// Show a prompt dialog
app.extensionManager.dialog.prompt({
  title: "User Input",
  message: "Please enter your name:",
  defaultValue: "User"
}).then(result => {
  if (result !== null) {
    console.log(`Input: ${result}`);
  }
});
```

### Confirm Dialog

Shows a dialog asking for user confirmation:

```javascript
// Show a confirmation dialog
app.extensionManager.dialog.confirm({
  title: "Confirm Action",
  message: "Are you sure you want to continue?",
  type: "default"
}).then(result => {
  console.log(result ? "User confirmed" : "User cancelled");
});
```

## API Reference

### Prompt Method

```javascript
app.extensionManager.dialog.prompt({
  title: string,             // Dialog title
  message: string,           // Message/question to display
  defaultValue?: string      // Initial value in the input field (optional)
}).then((result: string | null) => {
  // result is the entered text, or null if cancelled
});
```

### Confirm Method

```javascript
app.extensionManager.dialog.confirm({
  title: string,             // Dialog title
  message: string,           // Message to display
  type?: "default" | "overwrite" | "delete" | "dirtyClose" | "reinstall", // Dialog type (optional)
  itemList?: string[],       // List of items to display (optional)
  hint?: string              // Hint text to display (optional)
}).then((result: boolean | null) => {
  // result is true if confirmed, false if denied, null if cancelled
});
```

## Additional Information

For other specialized dialogs available in ComfyUI, extension authors can refer to the `dialogService.ts` file in the source code.

## Key Features

- **Cross-platform compatibility**: Works consistently across desktop and web environments
- **Promise-based**: Uses modern JavaScript Promise API for handling results
- **Flexible styling**: Supports different dialog types with appropriate styling
- **Cancellation support**: Handles user cancellation gracefully
- **Rich content**: Supports item lists and hints for complex confirmations

## Usage Notes

- The `prompt` method returns the entered text or `null` if cancelled
- The `confirm` method returns `true` if confirmed, `false` if denied, or `null` if cancelled
- Different dialog types provide appropriate styling and behavior for common use cases
- The `itemList` parameter is useful for showing what will be affected by the action
