# Sage_UNETLoader

**Load Diffusion Model w/ Metadata**

Loads a UNET diffusion model and outputs model info with metadata.

## Inputs

### Required

- **unet_name** (STRING): The name of the UNET model to load from available diffusion models
- **weight_dtype** (STRING): The weight data type for the model (default, fp8_e4m3fn, fp8_e4m3fn_fast, fp8_e5m2)

## Outputs

- **model** (MODEL): The loaded UNET model
- **model_info** (MODEL_INFO): The model path, name, and hash information

## Usage

Use to load UNET models and access their metadata for reporting or workflow logic. Supports different weight data types for memory optimization.

## Notes

- Automatically calculates and caches the model hash
- Pulls Civitai metadata information for the selected model
- Updates the timestamp for the loaded model in the cache
- Supports various weight data types including fp8 for memory efficiency
- Extends the standard ComfyUI UNETLoader with metadata support
- Model info includes the model type as "UNET"
