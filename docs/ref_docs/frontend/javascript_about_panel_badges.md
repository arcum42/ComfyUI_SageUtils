# JavaScript About Panel Badges

## Summary

The About Panel Badges API allows extensions to add custom badges to the ComfyUI about page. These badges can display information about your extension and contain links to documentation, source code, or other resources.

## Basic Usage

```javascript
app.registerExtension({
  name: "MyExtension",
  aboutPageBadges: [
    {
      label: "Documentation",
      url: "https://example.com/docs",
      icon: "pi pi-file"
    },
    {
      label: "GitHub",
      url: "https://github.com/username/repo",
      icon: "pi pi-github"
    }
  ]
});
```

## Badge Configuration

Each badge requires all of these properties:

```javascript
{
  label: string,           // Text to display on the badge
  url: string,             // URL to open when badge is clicked
  icon: string             // Icon class (e.g., PrimeVue icon)
}
```

## Icon Options

Badge icons use PrimeVue's icon set. Here are some commonly used icons:

- **Documentation**: `pi pi-file` or `pi pi-book`
- **GitHub**: `pi pi-github`
- **External link**: `pi pi-external-link`
- **Information**: `pi pi-info-circle`
- **Download**: `pi pi-download`
- **Website**: `pi pi-globe`
- **Discord**: `pi pi-discord`

For a complete list of available icons, refer to the [PrimeVue Icons documentation](https://primevue.org/icons/).

## Complete Example

```javascript
app.registerExtension({
  name: "BadgeExample",
  aboutPageBadges: [
    {
      label: "Website",
      url: "https://example.com",
      icon: "pi pi-home"
    },
    {
      label: "Donate",
      url: "https://example.com/donate",
      icon: "pi pi-heart"
    },
    {
      label: "Documentation",
      url: "https://example.com/docs",
      icon: "pi pi-book"
    }
  ]
});
```

## Key Features

- **Easy integration**: Simply add the `aboutPageBadges` array to your extension registration
- **Clickable links**: Badges open URLs when clicked
- **Icon support**: Uses PrimeVue icon set for consistent styling
- **Multiple badges**: Extensions can register multiple badges
- **Accessible location**: Badges appear in the About panel of the Settings dialog

## Usage Notes

- Badges appear in the About panel of the Settings dialog
- The About panel can be accessed via the gear icon in the top-right corner of the ComfyUI interface
- All three properties (label, url, icon) are required for each badge
- Icons should use PrimeVue's icon classes for consistent styling
- URLs can point to external resources like documentation, GitHub repositories, or support pages
