# Models Tab V2 - User Guide

A quick guide to using the new and improved Models Tab!

---

## What's New?

The Models Tab has been completely redesigned with these improvements:

### 🎯 Key Improvements

- **Browser-Style List** - No more dropdown! See all your models in a scrollable list
- **Folder Organization** - See your model folder structure with collapsible folders
- **Better Selection** - Clear green highlight shows which model is selected
- **Keyboard Support** - Navigate with arrow keys, no mouse needed!
- **Faster Performance** - Smooth scrolling even with 2000+ models
- **Quick Actions** - Hover over models for instant copy/edit/pull buttons

---

## Getting Started

### Finding Models

1. **Browse the List**
   - Scroll through the model browser
   - Click any model to select it

2. **Use Folders** (Hierarchical View)
   - Click folder name to expand/collapse
   - See model count badge on each folder
   - Use "Expand All" / "Collapse All" buttons

3. **Switch Views**
   - Click 📁 icon for hierarchical (folder) view
   - Click 📄 icon for flat (simple list) view

### Selecting a Model

**Three ways to select:**
1. **Click** on a model in the list
2. **Double-click** to select and view details
3. **Keyboard:** Use ↓↑ arrows, press Enter

**You'll know it's selected when:**
- Background turns green
- Thick green border appears on left
- Info panel shows model details below

---

## Using Filters

### Quick Filtering

**Folder Type:**
```
[All ▼] → [Checkpoints ▼]
```
Show only checkpoints, LoRAs, ControlNets, etc.

**Search Box:**
```
Type model name, version, or path
```
Instantly filters the list as you type

**Last Used:**
```
[All ▼] → [This Week ▼]
```
Find recently used models

**Updates:**
```
[All ▼] → [Updates Available ▼]
```
See which models have Civitai updates

### Sorting

**Sort By:**
- Name (A-Z or Z-A)
- Last Used (newest first)
- File Size (largest first)
- Type (by folder)

**Toggle Direction:**
Click ↑↓ button to reverse sort order

---

## Keyboard Shortcuts

### Navigation

| Press | To |
|-------|-----|
| ↓ | Move down one model |
| ↑ | Move up one model |
| Enter or Space | Select highlighted model |
| Home | Jump to first model |
| End | Jump to last model |
| Page Down | Jump down 10 models |
| Page Up | Jump up 10 models |
| Escape | Clear selection |

**Tip:** Click the model browser (or press Tab) to focus it first!

---

## Quick Actions

### Hover Buttons

Move your mouse over any model to see action buttons:

- **📋 Copy Name** - Copy model name to clipboard
- **📄 Copy Path** - Copy full file path
- **⬇️ Pull** - Fetch metadata from Civitai
- **✏️ Edit** - Edit model information

### Action Buttons

When a model is selected, action buttons appear below the info panel:

- **Pull Metadata** - Fetch from Civitai (shows progress)
- **Edit Information** - Modify model details
- **Copy Hash** - Copy SHA256 hash
- **Copy Path** - Copy full file path

---

## Collection Actions

At the top of the tab, these buttons work on your entire collection:

- **Refresh** - Reload model cache (use if models don't appear)
- **Scan** - Batch scan models for metadata
- **Report** - Generate HTML report of all models

**Tip:** These work without selecting a model!

---

## Working with Folders

### Hierarchical View (📁)

**Expand a Folder:**
Click the folder name or ▶ arrow

**Collapse a Folder:**
Click the folder name or ▼ arrow

**Expand All:**
Click "Expand All" button in header

**Collapse All:**
Click "Collapse All" button in header

**Folder Badge:**
Number shows how many models are inside (e.g., `(234)`)

### Flat View (📄)

Shows all models in a simple list:
- No folders
- Easier to scan
- Better for searching

**Toggle between views** using the 📁/📄 button in the header.

---

## NSFW Image Filtering

### Toggle Location

Look for **"Show NSFW Images"** checkbox next to the "Preview Images" header.

### How It Works

- ☑ **Checked:** Shows all preview images (including NSFW)
- ☐ **Unchecked:** Hides NSFW-tagged images

**Tip:** Your preference is saved automatically!

---

## Tips & Tricks

### Finding a Specific Model

1. Type in search box (fastest)
2. Or use filters to narrow down
3. Or press Home, then ↓ to browse from top

### Viewing Recently Used Models

1. Set "Last Used" filter to "This Week"
2. Set sort to "Last Used" (newest first)
3. Your recent models appear at top

### Organizing Large Collections

1. Use hierarchical view (📁)
2. Keep folders collapsed except what you're working on
3. Use "Collapse All" to reset view
4. Use search to find specific models

### Faster Performance

- **Filter** to reduce visible items
- **Use hierarchical view** with collapsed folders
- **Let rendering complete** before interacting (large collections)

### Keyboard Power User

1. Click model browser to focus (or Tab)
2. Type to search (no need to click search box)
3. Use arrow keys to navigate
4. Press Enter to select
5. Press Escape to clear

---

## Common Questions

### Why are some models showing twice?

They shouldn't! V2 automatically deduplicates symbolic links. If you see duplicates, they're actually different files with different hashes.

### How do I refresh the model list?

Click the **Refresh** button in "Collection Actions" at the top.

### Can I select multiple models?

Not yet! Multi-select is planned for a future update. For now, use the Scan or Report actions to work with multiple models.

### Why isn't keyboard navigation working?

You need to **focus the model browser first:**
- Click anywhere in the model list
- Or press Tab until it's focused
- You'll see a focus outline when it's active

### How do I go back to the old Models tab?

Open browser console (F12) and run:
```javascript
localStorage.setItem('sage_use_models_v2', 'false');
location.reload();
```

But why would you want to? 😊

---

## Troubleshooting

### Models Not Showing

**Try:**
1. Click "Refresh" button
2. Check your filters (set all to "All")
3. Clear search box (press Escape)
4. Reload ComfyUI page

### Slow Performance

**Try:**
1. Use filters to show fewer models
2. Use hierarchical view
3. Collapse all folders
4. Use search instead of scrolling

### Can't See Model Details

**Make sure:**
1. Model is actually selected (green background)
2. Scroll down to see info panel
3. If no info shows, model may not have metadata

---

## Feedback

Enjoying the new Models Tab? Have suggestions?

Let us know:
- Open an issue on GitHub
- Describe what you'd like to see
- Include screenshots if helpful

---

## Version Info

**Models Tab V2**  
Phase 4 Complete  
Last Updated: 2025-10-12

**Features:**
✅ Browser-style list  
✅ Hierarchical folders  
✅ Keyboard navigation  
✅ Quick actions  
✅ Enhanced performance  
✅ Accessibility support  

**Coming Soon:**
⏳ Multi-select  
⏳ Drag-and-drop  
⏳ Custom favorites  

Enjoy! 🎉
