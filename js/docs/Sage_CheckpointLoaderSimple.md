# Sage_CheckpointLoaderSimple

**Load Checkpoint w/ Metadata**

Loads a checkpoint and outputs model info, including hash and Civitai data. Model info is cached for quick access.

## Inputs

### Required

- **ckpt_name** (STRING): The name of the checkpoint (model) to load from all available checkpoints

## Outputs

- **model** (MODEL): The model used for denoising latents
- **clip** (CLIP): The CLIP model used for encoding text prompts
- **vae** (VAE): The VAE model used for encoding and decoding images to and from latent space
- **model_info** (MODEL_INFO): The model path and hash, all in one output

## Usage

Use to load checkpoints and retrieve their metadata for use in other nodes. This is the standard checkpoint loader with added metadata functionality.

## Notes

- Automatically calculates and caches the model hash
- Pulls Civitai metadata information for the selected model
- Updates the timestamp for the loaded model in the cache
- Shows all available checkpoints in the dropdown
- Extends the standard ComfyUI CheckpointLoaderSimple with metadata support
