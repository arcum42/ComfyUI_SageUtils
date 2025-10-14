# Sage Utils for ComfyUI

Sage Utils is a comprehensive suite of custom nodes and integrated UI features for ComfyUI. It provides:
- **Custom Nodes**: Simplify metadata creation, model and LoRA management, and other frequent tasks
- **LLM Integration**: Built-in LLM chat interface with vision support for generating and refining prompts
- **Prompt Builder**: Tag-based prompt construction system with LLM enhancement capabilities
- **Cross-Tab Integration**: Seamless data flow between workflows, LLM chat, and prompt builder

The node suite supports A1111/Civitai metadata formats, while the UI features provide modern, accessible interfaces for AI-assisted workflow creation.

**Model information downloaded from Civitai is cached locally in `sage_cache_hash.json` and `sage_cache_info.json` for fast access and reporting.** These are located in comfyui/user/default/SageUtils/.

## UI Features

### LLM Chat Tab
Access AI language models directly within ComfyUI for prompt generation, refinement, and creative assistance:

- **Multi-Provider Support**: LM Studio and Ollama (local providers for privacy and unlimited usage)
- **Vision Capabilities**: Upload up to 10 images for vision-enabled models with drag-and-drop support
- **Streaming Responses**: Real-time text generation with SSE (Server-Sent Events)
- **Conversation History**: Maintain context across multiple exchanges
- **Preset System**: Save and reuse complete LLM configurations (model, settings, system prompts)
- **System Prompt Management**: Create, save, and manage custom system prompts
- **Advanced Options**: Temperature, top-p, max tokens, presence/frequency penalties, keep-alive, system prompts
- **Keyboard Shortcuts**: Ctrl+Enter to send, Escape to blur textareas
- **Accessibility**: Full screen reader support with ARIA labels

📖 **[Complete LLM Tab Guide](docs/LLM_TAB_GUIDE.md)**

### Prompt Builder Tab
Wildcard and tag-based system for constructing complex prompts with LLM enhancement:

- **Wildcard System**: Use `__category__` syntax for dynamic, randomized prompt generation
- **Tag Library**: Pre-organized tag collections across multiple categories for quick insertion
- **Saved Prompts**: Save and manage complete prompt collections with descriptions
- **Seed-Based Generation**: Control randomization with fixed or random seeds for reproducibility
- **LLM Integration**: Send prompts to LLM for expansion, refinement, or creative variations
- **Cross-Tab Messaging**: Receive enhanced prompts back from LLM tab automatically
- **Positive/Negative Prompts**: Separate construction for better control
- **Keyboard Shortcuts**: Ctrl+Enter to generate, Escape to blur fields
- **Performance Optimized**: Debounced updates and rate-limited cross-tab messaging

📖 **[Complete Prompt Builder Guide](docs/PROMPT_BUILDER_GUIDE.md)**

### Cross-Tab Integration
Seamless data flow between all components:

- **Gallery to LLM**: Send images from gallery to LLM for vision analysis
- **LLM to Prompt Builder**: Enhanced prompts flow automatically to prompt builder
- **Prompt Builder to LLM**: Send constructed prompts for AI refinement
- **Rate Limited**: Intelligent throttling prevents system overload
- **Visual Feedback**: Clear notifications for all transfers

## Key Nodes

- **Save Image w/ Added Metadata**  
  An enhanced Save Image node with extra inputs for `param_metadata` and `extra_metadata`, allowing you to embed custom metadata under `parameters` (A1111 style) and `extra`. Includes switches to control inclusion of standard ComfyUI metadata.

- **Construct Metadata / Construct Metadata Lite**  
  Nodes for assembling metadata strings from various workflow inputs. The "Lite" version writes a more minimal set of metadata.

- **Load Checkpoint w/ Metadata**  
  Loads a checkpoint and outputs `model_info`, including hash and Civitai data. Model info is cached for quick access and reporting.

- **Load Diffusion Model w/ Metadata**  
  For loading UNET models with metadata support.

- **Simple Lora Stack**  
  Build and manage Lora stacks with toggles and weights. Chain these together for multiple LoRAs.

- **Triple Lora Stack**  
  Same as above, except with spots for three loras instead of one, and switches to toggle them on and off.

- **Lora Stack Loader**  
  Loads all Loras in a stack for use in your workflow.

- **Model + Lora Stack Loader**  
  Loads both a checkpoint and a LoRA stack in one node.

- **LoRA Stack → Keywords**  
  Extracts Civitai keywords from a LoRA stack.

- **Last LoRA Info**  
  Retrieves Civitai info, URLs, and sample images for the last LoRA in a stack.

- **Sampler Info**  
  Outputs sampler settings for use in metadata or workflow logic.

- **KSampler w/ Sampler Info**  
  A KSampler with a good deal of the settings broken off into a separate node, both for streamlining and so that you can hook the Sampler Info node up to one of the metadata nodes. You can also hook Sampler Info to more than one KSampler.

- **KSampler + Tiled Decoder**  
  Same as above, with two differences. First off, it has a VAE Decode node built in, and outputs both a latent and an image. Second, if you hook up a Tiling Info node to it, it will do a tiled vae decode instead. This input is optional.

- **KSampler + Audio Decoder**  
  KSampler with an audio decoder varient of the above nodes.

- **Prompts to CLIP**  
  Accepts a CLIP model and positive/negative prompts, returning both conditionings and the input text. Automatically zeros conditioning if no text is provided. Can also clean up the prompts.

- **Zero Conditioning**  
  Outputs zeroed conditioning for advanced prompt control.

- **Load Image w/ Size & Metadata**  
  Loads an image and outputs its size and embedded metadata.

- **Empty Latent Passthrough**  
  Like an Empty Latent Image node, but passes width/height for easier wiring. Includes a switch for SD3 compatibility.

- **Switch**  
  Simple logic node to select between two inputs based on a boolean.

- **Get Sha256 Hash**  
  Computes the SHA256 hash of a file or input.

- **Cache Maintenance**  
  Checks for missing or duplicate entries in the model cache, with options to clean up ghost entries and identify duplicates.

- **Model Scan & Report**  
  Scans and hashes all Loras and checkpoints, queries Civitai, and generates sorted model and LoRA lists for reporting and organization.

---

## Quick Start

### Setting Up LLM Integration

1. **Choose your LLM provider** (LM Studio or Ollama)
2. **Install and configure**:
   - **LM Studio**: Download from [lmstudio.ai](https://lmstudio.ai/), load a model, start local server
   - **Ollama**: Install from [ollama.ai](https://ollama.ai/), pull a model with `ollama pull llama3.2`
3. **Select provider** in LLM tab dropdown
4. **Select a model** from the available models list
5. **Start chatting** or use vision features by uploading images

See the [LLM Tab Guide](docs/LLM_TAB_GUIDE.md) for detailed setup instructions for each provider.

### Using Prompt Builder

1. **Open the Prompt Builder tab** in the sidebar
2. **Select tag categories** (character, style, quality, etc.)
3. **Choose specific tags** from each category
4. **Generate prompt** - tags are combined intelligently
5. **Optional**: Send to LLM for creative enhancement
6. **Use in workflows** - copy to clipboard or send to nodes

See the [Prompt Builder Guide](docs/PROMPT_BUILDER_GUIDE.md) for advanced usage and best practices.

## How to Use and Connect the Nodes

1. **Model Loading and Metadata**  
   Use **Load Checkpoint w/ Metadata** (or **Load Diffusion Model w/ Metadata**) to load your model and output `model_info`.  
   The `model_info` output can be connected to **Construct Metadata** or **Model + LoRA Stack Loader**.

2. **LoRA Stacks**  
   Build your LoRA stack by chaining **Simple LoRA Stack** nodes.  
   Connect the output to **LoRA Stack Loader** (to load LoRAs) and/or to **Construct Metadata** (to include LoRA info in metadata).

3. **Sampler and Conditioning**  
   Use **Sampler Info** to output sampler settings.  
   Connect **Sampler Info** to both your sampler node (e.g., **KSampler w/ Sampler Info** or **KSampler + Tiled Decoder**) and to **Construct Metadata** for metadata inclusion.

4. **Image and Metadata Output**  
   Use **Empty Latent Passthrough** to generate and pass image dimensions.  
   Connect all relevant metadata outputs (model info, LoRA stack, sampler info, image size, etc.) to **Construct Metadata** or **Construct Metadata Lite**.  
   Feed the resulting metadata string into the `param_metadata` input of **Save Image w/ Added Metadata**, and any other text you want in the metadata can be hooked up to `extra_metadata`.

5. **Additional Utilities**  
   Use **Load Image w/ Size & Metadata** to inspect images.  
   Use **LoRA Stack → Keywords** and **Last LoRA Info** for keyword extraction and LoRA details.  
   Use **Cache Maintenance** and **Model Scan & Report** for cache management and reporting.

---

## Example Workflows

Example workflows are available in the `example_workflows/` folder. In ComfyUI, you can also access these directly: open the workflow menu, choose **Browse Templates**, and select **comfyui_sageutils** on the left. All the example workflows are there and can be easily used as templates for your own workflows.

## Requirements

- **ComfyUI**: Latest version recommended
- **Python**: 3.9+ (included with ComfyUI)
- **Optional LLM Providers**:
  - Local: LM Studio, Ollama (free, run locally)

### Installation

1. Navigate to your ComfyUI custom nodes directory:
   ```bash
   cd ComfyUI/custom_nodes/
   ```

2. Clone this repository:
   ```bash
   git clone https://github.com/arcum42/ComfyUI_SageUtils.git
   ```

3. Install Python dependencies:
   ```bash
   cd ComfyUI_SageUtils
   pip install -r requirements.txt
   ```

4. Restart ComfyUI

The sidebar tabs (LLM Chat, Prompt Builder) will appear automatically in the ComfyUI interface.

## Documentation

- 📖 [LLM Tab Guide](docs/LLM_TAB_GUIDE.md) - Complete guide to using the LLM chat interface
- 📖 [Prompt Builder Guide](docs/PROMPT_BUILDER_GUIDE.md) - Tag-based prompt construction
- 📖 [API Documentation](docs/API.md) - Backend API endpoints and integration
- 📖 [Architecture](docs/ARCHITECTURE.md) - System design and technical details

## Features & Capabilities

### Accessibility
- **WCAG 2.1 Level AA Compliant**: Full screen reader support
- **Keyboard Navigation**: Complete keyboard control with shortcuts
- **ARIA Labels**: Comprehensive labeling for assistive technologies
- **Live Regions**: Dynamic content updates announced to screen readers

### Performance
- **Optimized Updates**: Debounced text inputs (300ms)
- **Rate Limiting**: Intelligent throttling for cross-tab messaging
- **Memory Management**: Automatic cleanup to prevent leaks
- **Efficient Streaming**: SSE-based real-time responses

### User Experience
- **Drag & Drop**: Image uploads with visual feedback
- **Real-time Validation**: Immediate feedback on image format/size
- **Visual Polish**: Modern UI with smooth animations
- **Smart Defaults**: Sensible presets for all options

If you have ideas, find bugs, or want to contribute, feel free to open issues or pull requests. If you find this project useful, consider supporting via [Ko-fi](https://ko-fi.com/arcum42).

---
