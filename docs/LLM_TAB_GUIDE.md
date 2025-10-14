# LLM Chat Tab - Complete Guide

The LLM Chat Tab brings AI language model capabilities directly into ComfyUI, enabling you to generate, refine, and enhance prompts without leaving your workflow environment.

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Supported Providers](#supported-providers)
4. [Text Generation](#text-generation)
5. [Vision Features](#vision-features)
6. [Advanced Options](#advanced-options)
7. [Conversation History](#conversation-history)
8. [Keyboard Shortcuts](#keyboard-shortcuts)
9. [Tips & Best Practices](#tips--best-practices)
10. [Troubleshooting](#troubleshooting)

---

## Overview

### Key Features

- **Multi-Provider Support**: LM Studio and Ollama with custom endpoint options
- **Vision Capabilities**: Upload and analyze images with vision-enabled models (drag-and-drop supported)
- **Real-time Streaming**: See responses generate in real-time with SSE
- **Conversation History**: Maintain context across multiple messages
- **Preset System**: Save and reuse complete LLM configurations (model, settings, system prompts)
- **System Prompt Management**: Create, save, and manage system prompts
- **Advanced Options**: Temperature, top-p, max tokens, presence/frequency penalties, keep-alive
- **Cross-Tab Integration**: Send responses to Prompt Builder or receive images from Gallery
- **Keyboard Shortcuts**: Ctrl+Enter to send, Escape to blur textareas
- **Accessibility**: Full keyboard navigation and screen reader support

### When to Use

- **Prompt Generation**: Create detailed, creative prompts from simple descriptions
- **Prompt Refinement**: Enhance existing prompts with better structure and keywords
- **Image Analysis**: Describe images or get prompt suggestions from reference images
- **Creative Assistance**: Brainstorm ideas, variations, or themes
- **Quality Control**: Review and improve prompt quality before generation

---

## Getting Started

### Opening the LLM Tab

1. Launch ComfyUI
2. Look for the **sidebar** on the right side of the screen
3. Click on the **LLM** or **Chat** tab icon

### Basic Workflow

### Basic Workflow

1. **Select a Provider**: Choose LM Studio or Ollama
2. **Configure if needed**: Set custom endpoints in settings (optional)
3. **Choose a Model**: Select from available models for your provider
4. **Enter Your Prompt**: Type your request in the text area
5. **Send**: Click "Send" or press **Ctrl+Enter**
6. **Review Response**: Watch the AI response stream in real-time

---

## Supported Providers

Sage Utils currently supports local LLM providers for privacy, unlimited usage, and no API costs.

### Local Providers

#### LM Studio
- **Models**: Any GGUF model you load in LM Studio
- **Vision Support**: ✅ (vision-capable models like LLaVA, BakLLaVA, MiniCPM-V)
- **Setup**:
  1. Download and install [LM Studio](https://lmstudio.ai/)
  2. Browse and download models from the built-in model browser
  3. Load a model in LM Studio
  4. Start the local server (Server tab → Start Server, default: http://localhost:1234)
  5. Select "lmstudio" from provider dropdown in Sage Utils
  6. Model will auto-detect

**Advantages**: 
- Free and unlimited
- Complete privacy (runs locally)
- No internet required for generation
- Customizable models and parameters
- User-friendly GUI for model management
- Support for custom endpoints

**Default Endpoint**: `http://localhost:1234/v1`

**Recommended Models**:
- Text: Llama 3, Mistral, Qwen, Phi-3
- Vision: LLaVA 1.6, BakLLaVA, MiniCPM-V

#### Ollama
- **Models**: Any model available in Ollama library
- **Vision Support**: ✅ (llava, bakllava, minicpm-v models)
- **Setup**:
  1. Install [Ollama](https://ollama.ai/)
  2. Pull a model from terminal:
     - Text: `ollama pull llama3.2` or `ollama pull mistral`
     - Vision: `ollama pull llava` or `ollama pull bakllava`
  3. Verify model is installed: `ollama list`
  4. Ensure Ollama service is running (runs automatically after install)
  5. Select "ollama" from provider dropdown in Sage Utils
  6. Enter exact model name (e.g., "llama3.2", "llava")

**Advantages**:
- Free and open source
- Easy model management via CLI
- Lightweight and efficient
- Active community and model library
- Automatic service management
- Simple installation

**Default Endpoint**: `http://localhost:11434`

**Popular Models**:
- **Text Generation**: 
  - `llama3.2` - Fast and capable
  - `llama3.1` - Larger, more powerful
  - `mistral` - Excellent performance
  - `mixtral` - Mixture of experts
  - `qwen2.5` - Strong multilingual
- **Vision**:
  - `llava` - General vision understanding
  - `bakllava` - Enhanced LLaVA variant
  - `minicpm-v` - Efficient vision model
  - `llava-phi3` - Compact vision model

**CLI Commands**:
```bash
# List available models remotely
ollama list

# Pull a model
ollama pull llama3.2

# Run a model (test)
ollama run llama3.2

# Remove a model
ollama rm modelname
```

### Custom Endpoints

Both providers support custom endpoint URLs for advanced configurations:

**Use Cases**:
- Docker containers running Ollama/LM Studio
- Remote Ollama instances on your network
- Custom ports (non-default)
- Network-accessible LM Studio instances
- Ollama running in WSL or VMs

**Setup**:
1. Open Sage Utils settings
2. Enable "Use Custom URL" for your provider
3. Enter custom endpoint (e.g., `http://192.168.1.100:11434`)
4. Save settings
5. Provider will use custom endpoint instead of default

---

## Text Generation

### Basic Usage

1. **Type your prompt** in the main text area
2. **Click "Send"** or press **Ctrl+Enter**
3. **Watch the response** stream in real-time
4. **Copy response** using the copy button
5. **Send to Prompt Builder** to use in tag-based prompts

### Example Prompts

#### Prompt Generation
```
Create a detailed prompt for a cyberpunk street scene at night
```

#### Prompt Refinement
```
Enhance this prompt with better details and artistic style:
"a girl in a park"
```

#### Creative Variations
```
Give me 5 variations of this theme:
"fantasy castle on a floating island"
```

### System Prompts

System prompts set the behavior and personality of the AI. They're applied before every request.

**To use**:
1. Click "Advanced Options" to expand
2. Enter system prompt in the dedicated field
3. System prompt persists across conversations

**Example System Prompts**:

```
You are an expert at creating detailed, artistic prompts for image generation.
Focus on visual details, lighting, composition, and artistic style.
```

```
You are a creative writing assistant specializing in fantasy and sci-fi themes.
Provide vivid descriptions with emphasis on mood and atmosphere.
```

---

## Vision Features

### Uploading Images

Three ways to add images:

1. **File Upload**:
   - Click "Add Image" button
   - Select up to 10 images
   - Supported: JPEG, PNG, WEBP, GIF
   - Max size: 10MB per image

2. **Drag & Drop**:
   - Drag images from your file explorer
   - Drop onto the preview area
   - Visual feedback during drag

3. **Paste**:
   - Copy image to clipboard
   - Click in the LLM tab
   - Press Ctrl+V

### Image Validation

The system validates all uploads:

✅ **Accepted Formats**: JPEG, JPG, PNG, WEBP, GIF  
✅ **Maximum Size**: 10MB per image  
✅ **Maximum Count**: 10 images total  

❌ **Rejected**:
- Unsupported formats (BMP, TIFF, SVG, etc.)
- Files over 10MB
- More than 10 images

**Error Messages**:
- "Unsupported format (BMP). Supported: JPEG, PNG, WEBP, GIF"
- "File too large (15.3MB). Maximum: 10MB"
- "Maximum 10 images allowed. Please remove some images first."

### Vision Model Usage

#### Example Vision Prompts

**Image Description**:
```
Describe this image in detail, focusing on composition and artistic elements
```

**Prompt Generation from Image**:
```
Create a detailed prompt that would generate an image similar to this
```

**Style Analysis**:
```
Analyze the artistic style of this image and suggest similar styles
```

**Multiple Image Comparison**:
```
Compare these images and identify common themes or elements
```

### Removing Images

- Click the **×** button on any image preview
- Click **Clear All** to remove all images
- Images are cleared when you start a new conversation

---

## Advanced Options

Click "Advanced Options" to reveal additional settings:

### Temperature (0.0 - 2.0)
Controls randomness and creativity:
- **0.0 - 0.3**: Focused, deterministic, consistent
- **0.4 - 0.7**: Balanced (recommended for most use cases)
- **0.8 - 1.2**: Creative, varied, exploratory
- **1.3 - 2.0**: Very random, experimental

**Default**: 0.7

### Top P (0.0 - 1.0)
Controls diversity via nucleus sampling:
- **0.1 - 0.5**: Conservative, safe choices
- **0.6 - 0.9**: Balanced diversity
- **1.0**: Maximum diversity

**Default**: 0.9

### Max Tokens (1 - 4096+)
Maximum length of response:
- **100-500**: Short, concise responses
- **500-1000**: Medium responses
- **1000-2000**: Detailed responses
- **2000+**: Very detailed or multiple examples

**Default**: 2048

### Presence Penalty (-2.0 - 2.0)
Encourages new topics:
- **-2.0 - 0.0**: Allows repetition
- **0.0**: Neutral
- **0.1 - 1.0**: Discourages repetition
- **1.0 - 2.0**: Strongly avoids repetition

**Default**: 0.0

### Frequency Penalty (-2.0 - 2.0)
Reduces word repetition:
- **-2.0 - 0.0**: Allows repeated words
- **0.0**: Neutral
- **0.1 - 1.0**: Discourages frequent words
- **1.0 - 2.0**: Strongly avoids repetition

**Default**: 0.0

### System Prompt
Sets AI behavior and personality. See [System Prompts](#system-prompts) section.

---

## Conversation History

### How It Works

The LLM tab maintains conversation context automatically:

1. **Each message** is stored (both user and AI)
2. **Context is maintained** across multiple exchanges
3. **History is included** in subsequent requests (when enabled)
4. **New conversation** starts fresh

### Managing Conversations

**Start New Conversation**:
- Click "New Conversation" button
- Clears all history
- Fresh context for new topic

**Include/Exclude History**:
- Toggle "Include History" in advanced options
- When enabled: AI remembers previous exchanges
- When disabled: Each message is independent

**Max History Messages**:
- Set how many previous messages to include
- Default: 10 messages
- Older messages are dropped automatically

### Viewing History

Click "Conversation History" to see:
- All messages in current conversation
- User and assistant roles clearly labeled
- Timestamps for each exchange
- Copy individual messages

### Best Practices

✅ **Do**:
- Start new conversation when changing topics
- Use history for iterative refinement
- Keep history enabled for context-dependent tasks
- Clear history when sensitive topics are discussed

❌ **Don't**:
- Let history grow too large (impacts token usage)
- Mix unrelated topics in one conversation
- Forget to start new conversation for fresh context

---

## Keyboard Shortcuts

### Text Input
- **Ctrl+Enter**: Send prompt
- **Escape**: Blur (unfocus) textarea

### Navigation
- **Tab**: Move between fields
- **Shift+Tab**: Move backwards

### Workflow
1. Type prompt
2. Press **Ctrl+Enter** to send
3. Review response
4. Press **Escape** to return to input
5. Modify and send again

---

## Tips & Best Practices

### Prompt Writing

✅ **Be Specific**:
```
Good: "Create a detailed cyberpunk street scene with neon signs, rain-slicked 
pavement, and crowds of people under umbrellas at night"

Avoid: "Make a cyberpunk scene"
```

✅ **Use Context**:
```
"Expand this basic prompt with artistic details, lighting, and composition: 
[your basic prompt]"
```

✅ **Request Structure**:
```
"Format the prompt as: subject, setting, lighting, mood, style, quality tags"
```

✅ **Iterate**:
- Start broad, then refine
- Ask for variations
- Request specific improvements

### Model Selection

**For Prompt Generation**:
- GPT-4o: Best balance of quality and speed
- Claude 3.5 Sonnet: Excellent creative writing
- Gemini 1.5 Pro: Great for detailed descriptions
- Local models (Llama 3.2): Free unlimited usage

**For Vision Tasks**:
- GPT-4o: Fast and accurate
- Claude 3 Opus: Best detail analysis
- LLaVA (local): Free, surprisingly good

### Token Management

- **Short prompts**: 500-1000 max tokens
- **Detailed responses**: 1500-2500 max tokens
- **Multiple examples**: 3000-4000 max tokens
- Monitor usage to control costs (cloud providers)

### Performance

- Use local models (LM Studio/Ollama) for unlimited free usage
- Enable streaming for better user experience
- Clear history periodically to reduce token usage
- Use appropriate max tokens to avoid waste

---

## Troubleshooting

### Common Issues

#### "Please select a model"
**Problem**: No model selected  
**Solution**: Choose a model from the dropdown after selecting provider

#### "API Error: 401 Unauthorized"
**Problem**: Invalid or missing API key  
**Solution**: 
1. Check API key is entered correctly
2. Verify key is active on provider's platform
3. Check for typos or extra spaces

#### "Connection failed" (Local providers)
**Problem**: LM Studio or Ollama not running  
**Solution**:
1. Ensure service is running
2. Check correct port (LM Studio: 1234, Ollama: 11434)
3. Verify firewall isn't blocking

#### "Model not found"
**Problem**: Specified model doesn't exist  
**Solution**:
1. Refresh model list
2. Check spelling
3. For Ollama: `ollama pull <model-name>` first

#### "Image upload failed"
**Problem**: Invalid image file  
**Solution**:
1. Check format (JPEG, PNG, WEBP, GIF only)
2. Verify size (under 10MB)
3. Don't exceed 10 images total

#### Streaming stops mid-response
**Problem**: Connection interrupted  
**Solution**:
1. Click "Stop" then resend
2. Check internet connection (cloud providers)
3. Check local service still running

#### Response is too short/long
**Problem**: Max tokens setting  
**Solution**: Adjust "Max Tokens" in Advanced Options

#### AI output is repetitive
**Problem**: Penalty settings too low  
**Solution**: Increase presence/frequency penalty (0.5-1.0)

#### AI output is too random
**Problem**: Temperature too high  
**Solution**: Decrease temperature (0.5-0.7)

### Getting Help

If you encounter issues not covered here:

1. Check [GitHub Issues](https://github.com/arcum42/ComfyUI_SageUtils/issues)
2. Review [API Documentation](API.md) for technical details
3. Open a new issue with:
   - Provider and model being used
   - Error message (exact text)
   - Steps to reproduce
   - Screenshots if applicable

---

## What's Next?

- Explore the [Prompt Builder Guide](PROMPT_BUILDER_GUIDE.md)
- Learn about [Cross-Tab Integration](README.md#cross-tab-integration)
- Review [API Documentation](API.md) for custom integrations
- Check out [Architecture](ARCHITECTURE.md) for technical details

---

**Happy prompting!** 🎨✨
