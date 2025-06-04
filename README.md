# Sage Utils for ComfyUI

Sage Utils is a suite of custom nodes for ComfyUI, designed to simplify metadata creation, model and LoRA management, and other frequent tasks. It supports A1111/Civitai metadata formats and includes a variety of utility nodes to streamline your workflow.  
**Model information downloaded from Civitai is cached locally in `sage_cache_hash.json` and `sage_cache_info.json` for fast access and reporting.** These are located in comfyui/user/default/SageUtils/.

![Example Workflow Image](examples/example_workflow.png)

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

If you have ideas, find bugs, or want to contribute, feel free to open issues or pull requests. If you find this project useful, consider supporting via [Ko-fi](https://ko-fi.com/arcum42).

---
