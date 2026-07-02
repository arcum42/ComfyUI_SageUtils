# Sage_CheckpointLoaderRecent

**Load Recently Used Checkpoint**

Loads a checkpoint from a list of recently used models and outputs the loaded model components plus model info.

## Inputs

### Required

- **ckpt_name** (STRING): The name of the checkpoint (model) to load from the recently used models list

## Outputs

- **model** (MODEL): The model used for denoising latents
- **clip** (CLIP): The CLIP model used for encoding text prompts
- **vae** (VAE): The VAE model used for encoding and decoding images to and from latent space
- **model_info** (MODEL_INFO): The model path and hash, all in one output

## Usage

Use to quickly access and load recently used model checkpoints. The node automatically maintains a list of recently used models for easy selection.

## Notes

- Automatically calculates and caches the model hash
- Pulls Civitai metadata information for the selected model
- Updates the timestamp for the loaded model in the cache
- Only shows models that have been recently used in the dropdown
