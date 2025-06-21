# Sage_CheckpointSelector

**Checkpoint Selector**

Selects a model checkpoint and returns its metadata information without loading the actual model.

## Inputs

### Required

- **ckpt_name** (STRING): The name of the checkpoint (model) to select from available checkpoints

## Outputs

- **model_info** (MODEL_INFO): The model path and hash, all in one output

## Usage

Use to choose which model checkpoint to reference in your workflow without loading it. Useful for metadata workflows or conditional model loading.

## Notes

- Does not load the actual model, only returns metadata
- Automatically calculates and caches the model hash
- Pulls Civitai metadata information for the selected model
- Updates the timestamp for the selected model in the cache
- Useful for workflows that need model information before deciding whether to load
