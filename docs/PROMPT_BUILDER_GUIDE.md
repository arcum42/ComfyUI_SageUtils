# Prompt Builder - Complete Guide

The Prompt Builder provides a wildcard-based system with tag library support for constructing complex, detailed prompts with optional LLM enhancement capabilities.

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Wildcard System](#wildcard-system)
4. [Tag Library](#tag-library)
5. [Building Prompts](#building-prompts)
6. [LLM Integration](#llm-integration)
7. [Saved Prompts](#saved-prompts)
8. [Advanced Features](#advanced-features)
9. [Keyboard Shortcuts](#keyboard-shortcuts)
10. [Tips & Best Practices](#tips--best-practices)
11. [Troubleshooting](#troubleshooting)

---

## Overview

### What is Prompt Builder?

The Prompt Builder is a wildcard and tag-based prompt construction system that helps you:
- **Build complex prompts** using wildcard syntax (`__category__`)
- **Manage tag collections** with organized categories
- **Generate variations** with seed-based randomization
- **Enhance with AI** using LLM integration
- **Manage both positive and negative prompts** separately
- **Save and reuse** successful prompt patterns and collections

### Key Features

- **Wildcard System**: Use `__category__` syntax for dynamic prompt generation
- **Tag Library**: Pre-organized tag collections across multiple categories  
- **Saved Prompts**: Save and manage complete prompt collections
- **Positive/Negative Prompts**: Separate construction for better control
- **LLM Integration**: Send prompts to LLM for enhancement and creative variations
- **Cross-Tab Messaging**: Receive enhanced prompts from LLM automatically
- **Seed-Based Generation**: Control randomization with fixed or random seeds
- **Multiple Variations**: Generate multiple prompt variations in one click
- **Performance Optimized**: Debounced updates prevent lag
- **Keyboard Shortcuts**: Efficient workflow with Ctrl+Enter

### When to Use

✅ **Use Prompt Builder when**:
- Want randomized variations using wildcard categories
- Building complex prompts with reusable components
- Need consistency across multiple generations with controlled variation
- Managing tag libraries for quick prompt assembly
- Saving and reusing successful prompt patterns
- Building negative prompts with known unwanted elements

✅ **Use LLM Tab when**:
- Starting from scratch with just an idea
- Need creative variations or brainstorming
- Want natural language prompt writing
- Analyzing images for prompt generation
- Refining or expanding existing prompts with AI assistance

**Best Results**: Use both together! Build base with wildcards in Prompt Builder → Send to LLM for enhancement → Receive refined version back

---

## Getting Started

### Opening Prompt Builder

1. Launch ComfyUI
2. Look for the **sidebar** on the right side
3. Click on the **Prompt Builder** tab

### Basic Workflow

1. **Enter prompts** with wildcard syntax (e.g., `__character__`)
2. **Set seed and count** for controlled randomization
3. **Generate** to replace wildcards with random selections
4. **Optional**: Browse tag library to insert tags/wildcards
5. **Optional**: Send to LLM for AI enhancement
6. **Copy** or **Send to Node** to use in your workflow

### Quick Example

Let's build a prompt using wildcards:

1. **Write Prompt with Wildcards**:
   ```
   __character__ in a __location__, __art_style__, __quality__
   ```

2. **Generate** (the wildcards are replaced):
   ```
   1girl, long hair, blue eyes in a cyberpunk city, digital art style, masterpiece quality
   ```

3. **Generate Again** (different random result):
   ```
   1boy, short hair, standing in a forest clearing, oil painting style, highly detailed
   ```

---

## Wildcard System

### What Are Wildcards?

Wildcards are placeholders in your prompts that get replaced with random values from a category. They use the syntax `__category_name__`.

**Example**:
```
__character__ wearing __clothing__ in a __location__
```

When generated, becomes:
```
warrior wearing battle armor in a mountain fortress
```

### Wildcard Syntax

**Basic Format**:
- Wildcards are surrounded by double underscores: `__name__`
- Case-sensitive: `__Character__` ≠ `__character__`
- Can be anywhere in your prompt
- Multiple wildcards are replaced independently

**Examples**:
```
A __adjective__ __subject__ in a __setting__ at __time_of_day__
```

### Using Wildcards

1. **Type Manually**: Just type `__category__` directly in the prompt field
2. **Insert from Tag Library**: Click tags in the library to insert wildcards
3. **Highlight Detection**: Valid wildcards are automatically detected
4. **Validation**: The system shows which wildcards are found

### Seed Control

Wildcards use seed-based randomization for reproducibility:

- **Random Seed**: Click "Random Seed" for different results each time
- **Fixed Seed**: Enter a specific number to get same results
- **Count**: Generate multiple variations with one click

**Example Workflow**:
```
Prompt: __character__ in __location__
Seed: 12345
Count: 3

Result 1 (seed 12345): warrior in castle
Result 2 (seed 12346): mage in forest  
Result 3 (seed 12347): archer in mountains
```

---

## Tag Library

The Tag Library provides organized collections of tags and wildcards you can insert into your prompts.

### What is the Tag Library?

A searchable, categorized collection of:
- **Individual Tags**: Specific descriptors (e.g., "masterpiece", "1girl")
- **Tag Sets**: Pre-grouped collections of related tags
- **Wildcard Categories**: Categories that can be inserted as `__category__`

### Using the Tag Library

1. **Browse Categories**: Click category tabs to view different tag collections
2. **Search Tags**: Use the search box to find specific tags
3. **Insert Tags**: Click any tag to insert it into your prompt
4. **Insert as Wildcard**: Many categories can be inserted as wildcards

### Tag Categories

### Tag Categories

The tag library organizes tags into categories for easy browsing:

- **Character Tags**: People, poses, features, expressions
- **Style Tags**: Art styles, mediums, artist references
- **Quality Tags**: Technical quality descriptors
- **Location/Setting Tags**: Environments, backgrounds
- **Lighting Tags**: Lighting types and moods
- **Color Tags**: Color palettes and themes
- **Mood/Atmosphere Tags**: Emotional tone
- **Camera Tags**: Angles, framing, composition
- **Custom Categories**: User-defined tag collections

**Using Categories**:
- Browse by clicking category tabs
- Search across all categories
- Insert individual tags or entire category as wildcard

### Managing Tags

**Insert Tag**:
- Click any tag to insert it at cursor position
- Tags are added with proper formatting

**Insert as Wildcard**:
- Click category name or special button
- Inserts `__category__` into your prompt
- Will randomize when generating

**Edit Tags** (if enabled):
- Add new tags to categories
- Create custom categories
- Organize your own tag library

---

## Saved Prompts

The Saved Prompts feature lets you save, organize, and reuse complete prompt collections.

### What Are Saved Prompts?

Complete prompt configurations including:
- Positive prompt text (with wildcards)
- Negative prompt text
- Seed value
- Description/notes
- Category/organization

### Saving Prompts

1. Create your prompt with wildcards
2. Click "Save Prompt" button
3. Enter name and optional description
4. Choose category (or create new)
5. Save

**What Gets Saved**:
- Full positive prompt text
- Full negative prompt text  
- Current seed value
- Your description
- Metadata (date created, etc.)

### Loading Saved Prompts

1. Open "Saved Prompts" section
2. Browse by category
3. Click prompt name to load
4. All fields populate automatically

**Options When Loading**:
- **Replace**: Overwrites current prompts
- **Append**: Adds to existing prompts
- **New Seed**: Generate with random seed vs. saved seed

### Organizing Saved Prompts

**Categories**:
- Group related prompts together
- Create custom categories
- Filter by category

**Search**:
- Search by name
- Search by description
- Search prompt content

**Management**:
- Edit saved prompts
- Delete unused prompts
- Export/Import collections

---

## Building Prompts

### Positive Prompts

Positive prompts define **what you want** in the image.

**Wildcard Strategy**:
1. **Subject** (character or main focus) - `__character__`
2. **Action/Pose** - `__pose__` or `__action__`
3. **Setting** (location, environment) - `__location__` or `__setting__`
4. **Style** (artistic style, medium) - `__art_style__`
5. **Lighting** - `__lighting__`
6. **Quality** (technical tags) - `__quality__`

**Example with Wildcards**:
```
Positive: __character__ __pose__ in a __location__, __art_style__, 
__lighting__, __quality__
```

**Generated Result** (example):
```
1girl, standing gracefully in a cherry blossom garden, anime style, 
golden hour lighting, masterpiece, highly detailed
```

**Mixed Wildcards and Direct Tags**:
```
Positive: __character__, long flowing hair, wearing elegant white dress, 
in a __location__, __art_style__, best quality, 8k
```

### Negative Prompts

Negative prompts define **what you don't want** in the image.

**Common Approach**:
- Use direct tags for negative prompts
- Wildcards less useful for negatives
- Build standard negative template

**Standard Negative Tags**:
```
Negative: low quality, worst quality, blurry, bad anatomy, extra fingers,
poorly drawn hands, deformed, ugly, watermark, signature, text
```

**Advanced Negative with Wildcards** (less common):
```
Negative: __bad_quality__, __bad_anatomy__, __unwanted_elements__
```

### Using Both Together

Combine wildcards and direct tags for maximum control:

```
Positive: 
__character__, beautiful detailed eyes, flowing hair,
wearing __clothing__ in a __location__,
__art_style__, __lighting__,
masterpiece, best quality, highly detailed, 8k

Negative:
low quality, worst quality, blurry, bad anatomy, extra fingers,
poorly drawn, deformed, ugly, watermark, text
```

---

## LLM Integration

## LLM Integration

### Sending to LLM

The Prompt Builder integrates seamlessly with the LLM tab:

1. **Build your base prompt** using wildcards and/or tags
2. **Generate** to see a concrete example (optional)
3. **Click "Send to LLM"** button
4. **Prompt is automatically sent** to LLM tab with context
5. **LLM enhances** the prompt
6. **Enhanced version returns** to Prompt Builder automatically

**Visual Feedback**:
- Button shows "✓ Sent!" for 1.5 seconds
- Notification appears confirming transfer
- LLM tab automatically receives prompt

### What Happens in LLM

The LLM receives your prompt with helpful context:

**If sent before generating**:
```
Enhance this prompt template. It contains wildcards (__name__) that will be 
replaced with random values. Improve the structure and add artistic details:

[Your prompt with wildcards]
```

**If sent after generating**:
```
Enhance this generated prompt with better details, artistic elements, and structure:

[Your generated prompt]
```

You can customize the LLM request or use default enhancement prompts.

### Receiving Enhanced Prompts

When the LLM sends a prompt back:

1. **Notification appears**: "Received text from LLM Tab"
2. **Positive prompt field updates** automatically
3. **Review** the enhanced version
4. **Wildcards preserved** if LLM maintained them
5. **Edit** if needed
6. **Generate** or use directly

### Workflow Examples

**Wildcard Enhancement**:
```
1. You send: __character__ in __location__
2. LLM enhances: __character__, highly detailed, in a __location__, 
   cinematic composition, volumetric lighting, trending on artstation
3. Generate creates variations with enhanced template
```

**Generated Prompt Enhancement**:
```
1. Generate: warrior in castle
2. Send to LLM
3. LLM enhances: battle-worn warrior standing in ancient stone castle, 
   dramatic lighting streaming through gothic windows, leather armor with 
   intricate details, epic fantasy atmosphere, highly detailed, 8k
```

### Manual Editing

You can always edit prompts manually:

- **Type directly** in positive/negative fields
- **Add custom tags** not in the library
- **Adjust AI suggestions** to your preference
- **Combine** wildcard-based and freeform text
- **Modify** before or after LLM enhancement

---

## Advanced Features

### Wildcard Highlighting

The system automatically detects and highlights wildcards:

- Valid wildcards show in textarea title
- Count of wildcards displayed
- List of detected wildcards shown on hover
- Invalid syntax warnings (future feature)

**Viewing Wildcards**:
- Hover over textarea to see detected wildcards
- Check if your `__syntax__` is correct
- Verify wildcard names match available categories

### Prompt Validation

Before generating, the system validates:

- **Wildcard Syntax**: Checks for valid `__name__` format
- **Available Categories**: Warns if wildcard category doesn't exist
- **Empty Prompts**: Prevents generation with no content
- **Seed Value**: Validates seed is a valid number

**Error Messages**:
- "No wildcards found in prompt"
- "Invalid wildcard syntax"
- "Category '__name__' not found"

### Seed Management

Control prompt variation and reproducibility:

- **Random Seed**: Click to generate new random seed (0-2147483647)
- **Fixed Seed**: Enter specific number for reproducibility  
- **Count**: Generate multiple variations with sequential seeds

**Use Cases**:
- **Random**: Exploring different variations
- **Fixed**: Reproducing exact results
- **Count > 1**: Batch generation with variations

**Example**:
```
Prompt: __character__ in __location__
Seed: 42
Count: 5

Generates 5 prompts using seeds 42, 43, 44, 45, 46
```

### Multiple Variations

Generate multiple prompts in one click:

1. Set **Count** to desired number (1-20)
2. Click **Generate**
3. View all results in Results section
4. Each uses sequential seed for reproducibility

**Results Display**:
- Each variation shown separately
- Seed number displayed for each
- Copy individual results
- Send any result to LLM for further enhancement

### Custom Wildcard Files

Create your own wildcard categories:

1. Navigate to `SageUtils/wildcards/` folder
2. Create `.txt` file named `category.txt`
3. Add one option per line
4. Use as `__category__` in prompts

**Example Custom Wildcard** (`weapons.txt`):
```
sword
bow
staff
dagger
hammer
```

**Usage**:
```
__character__ wielding a __weapons__ in __location__
```

### Integration with Nodes

Send prompts directly to your workflow:

- **"Send to Node"** button (when node is selected)
- Populates text field in selected CLIPTextEncode or similar node
- Supports positive and negative prompts
- Updates node immediately in workflow

**Workflow**:
1. Select a text input node in workflow
2. Build/generate prompt in Prompt Builder
3. Click "Send to Node"
4. Node updates with your prompt

### Receiving Enhanced Prompts

When the LLM sends a prompt back:

1. **Notification appears**: "Received text from LLM"
2. **Positive prompt field updates** automatically
3. **Review** the enhanced version
4. **Edit** if needed
5. **Use** in your workflow

### Manual Editing

You can always edit prompts manually:

- **Type directly** in positive/negative fields
- **Add custom tags** not in the library
- **Adjust AI suggestions** to your preference
- **Combine** tag-based and freeform text

---

## Advanced Features

### Seed Management

Control prompt variation and reproducibility:

- **Random Seed**: Click to generate new random seed
- **Fixed Seed**: Enter specific number for reproducibility
- **Count**: Generate multiple variations

**Use Cases**:
- **Random**: Exploring different variations
- **Fixed**: Reproducing exact results
- **Count > 1**: Batch generation with variations

### Custom Tag Libraries

You can extend the built-in tag library:

1. Navigate to `assets/default_tag_library.json`
2. Add your custom tags following the JSON structure
3. Restart ComfyUI
4. New tags appear in appropriate categories

**Example Custom Tag**:
```json
{
  "category": "style",
  "tags": [
    {
      "name": "My Custom Style",
      "prompt": "custom artistic style, unique rendering",
      "description": "My personal art style preference"
    }
  ]
}
```

### Prompt Templates

Save successful prompt patterns as templates:

**Method 1**: Manual Save
- Copy successful prompts to a text file
- Store in `assets/metadata_templates.json`
- Reference when building similar prompts

**Method 2**: Clipboard
- Use the built-in copy button
- Paste into text editor
- Build your own library

### Performance Features

The Prompt Builder includes optimizations:

- **Debounced Updates**: Text changes wait 300ms before processing
- **Rate Limited Messaging**: Cross-tab updates throttled to prevent overload
- **Efficient Rendering**: Only updates changed elements
- **Memory Management**: Automatic cleanup prevents leaks

You shouldn't notice these, but they ensure smooth operation!

---

## Keyboard Shortcuts

### Prompt Fields

- **Ctrl+Enter**: Generate/update prompt from tags
- **Escape**: Blur (unfocus) text field

### Workflow

1. Select tags using mouse/keyboard
2. Press **Ctrl+Enter** in positive field to generate
3. Review result
4. Press **Escape** to unfocus
5. Make adjustments
6. Press **Ctrl+Enter** again

### Navigation

- **Tab**: Move between fields
- **Shift+Tab**: Move backwards
- Mouse click to focus specific field

---

## Tips & Best Practices

### Building Effective Prompts with Wildcards

✅ **Start with a Template**:
```
Good: __character__ __pose__ in __location__, __art_style__, __quality__
Avoid: random tags without structure
```

✅ **Mix Wildcards and Specific Tags**:
```
Good: __character__, blue eyes, silver hair, in a __location__, __art_style__
Avoid: All wildcards OR all specific (use both!)
```

✅ **Layer Your Details**:
1. Core subject (wildcard or specific)
2. Key features (mix of both)
3. Environment (wildcards)
4. Artistic style (wildcards)
5. Quality tags (usually specific)

✅ **Use Quality Tags**:
Always include basic quality tags:
```
masterpiece, best quality, highly detailed
```

✅ **Balance Positive and Negative**:
- Positive: What you want in detail (use wildcards for variation)
- Negative: Common problems (usually specific tags)

### Wildcard Strategy

**For Maximum Variation**:
```
__character__ wearing __clothing__ in a __location__ at __time_of_day__,
__art_style__, __lighting__, __quality__
```

**For Controlled Variation**:
```
1girl, long hair, wearing __clothing__, standing in a garden,
anime style, __lighting__, masterpiece quality
```

**For Minimal Variation**:
```
1girl, long silver hair, blue eyes, white dress, cherry blossom garden,
anime style, soft lighting, masterpiece quality, 8k
```

### Tag Selection Strategy

**For Character Portraits**:
```
__character__, __expression__, __clothing__, 
simple __background__, __art_style__, __quality__
```

**For Landscape Scenes**:
```
__location__, __time_of_day__, __weather__, __season__,
__art_style__, __lighting__, __quality__
```

**For Action Scenes**:
```
__character__ __action__ in __location__,
dynamic angle, __art_style__, __lighting__, __quality__
```

**For Abstract/Artistic**:
```
__subject__, __color_palette__, __art_style__,
__mood__, __quality__
```

### LLM Enhancement Tips

**When to Send to LLM**:
- Wildcard template feels basic
- Want creative additions to template
- Need better structure
- Exploring new themes
- Stuck for specific details

**When to Skip LLM**:
- You have exact wildcards you want
- Using a proven template
- Testing specific wildcard combinations
- Time-sensitive generation
- Want pure randomization without AI interpretation

**After Receiving Enhancement**:
- Review wildcards (AI might have removed them)
- Check if structure still makes sense
- Remove unwanted additions
- Verify wildcards still work
- Re-generate to test

### Common Mistakes to Avoid

❌ **Too Many Wildcards**:
```
Bad: __a__ __b__ __c__ __d__ __e__ __f__ __g__
Good: __character__ in __location__, detailed, __art_style__
```

❌ **No Structure**:
```
Bad: __random__, __stuff__, __things__
Good: __character__ __pose__ in a __location__, __art_style__, __quality__
```

❌ **Invalid Wildcard Names**:
```
Bad: __my category__, __123__, __-special-__
Good: __character__, __art_style__, __quality__
```

❌ **Forgetting Quality Tags**:
```
Bad: __character__ in __location__
Good: __character__ in __location__, masterpiece, best quality, highly detailed
```

❌ **Only Wildcards in Negative**:
```
Bad: __bad_things__, __bad_quality__
Good: low quality, blurry, bad anatomy, poorly drawn
```

### Saved Prompts Best Practices

✅ **Organize with Categories**:
- Character Portraits
- Landscapes
- Fantasy Scenes
- Sci-Fi Scenes
- etc.

✅ **Use Descriptive Names**:
- Good: "Fantasy Warrior - Epic Battle Scene"
- Avoid: "prompt1", "test", "new"

✅ **Add Descriptions**:
- Note what makes the prompt special
- List key wildcards used
- Mention best models/settings

✅ **Version Your Prompts**:
- "Character Portrait v1"
- "Character Portrait v2 - Enhanced"
- Makes iteration tracking easier

### Workflow Tips

**Rapid Exploration**:
1. Create template with many wildcards
2. Set count to 10
3. Generate batch
4. Pick best results
5. Send best to LLM for enhancement

**Iterative Refinement**:
1. Start with wildcard template
2. Generate a few variations
3. Replace successful wildcards with specific tags
4. Keep wildcards for elements you want to vary
5. Save as template

**Consistency Across Set**:
1. Create template with selective wildcards
2. Use fixed seed
3. Generate your set
4. Adjust seed slightly for related variations

---
Better: "## Troubleshooting

### Common Issues

#### "No wildcards found"
**Problem**: Your prompt doesn't contain valid wildcard syntax  
**Solution**: 
- Check syntax: must be `__name__` (double underscores each side)
- No spaces: `__art style__` is invalid, use `__art_style__`
- Check spelling of wildcard category names

#### Wildcards not replaced
**Problem**: Wildcards remain as `__name__` after generation  
**Solution**:
- Verify wildcard category exists in tag library
- Check for typos in wildcard name
- Ensure generation button was clicked (not just entered)
- Check console for error messages

#### "Category not found"
**Problem**: Wildcard category doesn't exist  
**Solution**:
- Browse tag library to see available categories
- Check spelling and case sensitivity
- Create custom wildcard file if needed
- Use existing categories from tag library

#### Can't save prompts
**Problem**: Save button doesn't work or prompts don't persist  
**Solution**:
1. Check browser console for errors
2. Verify write permissions to ComfyUI folder
3. Check disk space
4. Try refreshing and saving again

#### Tag library not loading
**Problem**: Tag library section is empty  
**Solution**:
1. Check console for API errors
2. Verify tag routes are registered
3. Check `assets/default_tag_library.json` exists
4. Restart ComfyUI

#### Send to LLM not working
**Problem**: LLM doesn't receive prompt  
**Solution**:
1. Ensure LLM tab exists in sidebar
2. Check browser console for cross-tab messaging errors
3. Try switching to LLM tab first, then send
4. Check notification messages for errors

#### Generated prompts identical
**Problem**: Multiple generations produce same result  
**Solution**:
- Click "Random Seed" for different results
- Change seed value manually
- Check that wildcards are in prompt
- Verify count > 1 if expecting multiple results

#### Clipboard copy fails
**Problem**: Copy button doesn't work  
**Solution**:
1. Check browser clipboard permissions
2. Try manual select and copy (Ctrl+C)
3. Use "Send to Node" instead
4. Check browser console for errors

### Performance Issues

#### Slow generation
**Problem**: Takes long time to generate prompts  
**Solution**:
- Reduce number of wildcards per prompt
- Lower count value
- Check for very large wildcard files
- Clear saved prompts if database is large

#### UI lag when typing
**Problem**: Textarea input feels slow  
**Solution**:
- This is debouncing (300ms delay) - working as intended
- Reduces server calls while typing
- Wait briefly after typing before expecting updates

### Getting Help

**Check Documentation**:
1. This guide for prompt building
2. [LLM Tab Guide](LLM_TAB_GUIDE.md) for LLM features  
3. [API Documentation](API.md) for technical details
4. [Architecture](ARCHITECTURE.md) for system design

**Debug Steps**:
1. Open browser console (F12)
2. Look for error messages (red text)
3. Check network tab for failed API calls
4. Copy error messages when reporting issues

**Report Issues**:
- Check existing GitHub issues first
- Include error messages from console
- Describe steps to reproduce
- Mention browser and OS
- Include example prompts if relevant

---

**Related Documentation**:
- [LLM Tab Guide](LLM_TAB_GUIDE.md) - AI enhancement features
- [Architecture](ARCHITECTURE.md) - Technical system design
- [API Documentation](API.md) - Backend endpoints and integration"
```

❌ **Conflicting Tags**:
```
Bad: "photorealistic, anime style, cartoon"
Better: "anime style, vibrant colors, detailed shading"
```

❌ **Overloading**:
```
Bad: 50+ tags with everything you can think of
Better: 15-25 well-chosen, specific tags
```

❌ **Ignoring Negative Prompts**:
```
Bad: (empty negative prompt)
Better: "low quality, bad anatomy, blurry, deformed"
```

### Workflow Optimization

**Fast Iteration**:
1. Build base prompt with core tags
2. Generate and review
3. Add refinement tags
4. Generate again
5. Repeat until satisfied

**Batch Variations**:
1. Build solid base prompt
2. Set count to 4-10
3. Use random seed
4. Generate multiple variations
5. Pick best, refine further

**Template Reuse**:
1. Save successful prompts
2. Modify subject/details
3. Keep working structure
4. Adapt to new themes

---

## Troubleshooting

### Common Issues

#### Tags not appearing in prompt
**Problem**: Selected tags don't show in generated prompt  
**Solution**: 
- Click "Generate" or press Ctrl+Enter
- Check if tag category is enabled
- Refresh the tab

#### "Send to LLM" button doesn't work
**Problem**: No response after clicking  
**Solution**:
- Check if LLM tab is loaded
- Ensure ComfyUI server is running
- Look for notification confirming send
- Check browser console for errors

#### Prompt too long
**Problem**: Generated prompt exceeds model limit  
**Solution**:
- Remove less important tags
- Focus on core elements
- Split into multiple generations
- Use more concise tags

#### LLM enhancement doesn't return
**Problem**: Sent to LLM but no response received  
**Solution**:
- Check LLM tab for errors
- Ensure generation completed
- Click "Send to Prompt Builder" manually
- Check cross-tab messaging is working

#### Random seed not changing
**Problem**: Same seed generates same images  
**Solution**:
- Click "Random Seed" button again
- Manually enter different number
- Refresh the tab if stuck

### Performance Issues

#### Slow typing in text fields
**Problem**: Lag when typing in prompt fields  
**Solution**:
- This is normal (300ms debouncing)
- Type your full text, updates happen after pause
- Feature prevents excessive updates

#### Tags not loading
**Problem**: Tag categories are empty  
**Solution**:
- Check `assets/default_tag_library.json` exists
- Verify JSON format is valid
- Restart ComfyUI
- Check browser console for errors

### Getting Help

If issues persist:

1. Check [GitHub Issues](https://github.com/arcum42/ComfyUI_SageUtils/issues)
2. Review [LLM Tab Guide](LLM_TAB_GUIDE.md) for LLM integration
3. Check [Architecture](ARCHITECTURE.md) for technical details
4. Open new issue with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots
   - Browser console errors

---

## Comparison: Prompt Builder vs LLM Tab

| Feature | Prompt Builder | LLM Tab |
|---------|---------------|---------|
| **Input Method** | Tag selection | Natural language |
| **Best For** | Structured, consistent prompts | Creative, freeform requests |
| **Speed** | Fast tag picking | Depends on LLM response |
| **Precision** | High (exact tags) | Variable (AI interpretation) |
| **Creativity** | Limited to tags | High (AI suggestions) |
| **Learning Curve** | Low (guided) | Medium (requires prompting skill) |
| **Negative Prompts** | Dedicated field | Must request explicitly |
| **Reproducibility** | High | Medium |
| **Ideal Use** | Technical control | Creative exploration |

**Recommendation**: Use both together! Start in Prompt Builder for structure, enhance in LLM for creativity.

---

## What's Next?

- Learn about [LLM Tab](LLM_TAB_GUIDE.md) for prompt enhancement
- Explore [Cross-Tab Integration](../README.md#cross-tab-integration)
- Review [API Documentation](API.md) for custom integrations
- Check [Architecture](ARCHITECTURE.md) for technical details

---

**Build better prompts!** 🎨✨
