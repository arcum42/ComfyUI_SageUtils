# Sage_ModelInfo

**Model Info**

Retrieves Civitai model information and metadata based on model info input.

## Inputs

- **model_info** (MODEL_INFO, required): Model information containing hash and metadata

## Outputs

- **base_model** (STRING): The base model type (e.g., SDXL, SD1.5, etc.)
- **name** (STRING): Model name with version information
- **url** (STRING): Civitai URL for the specific model version
- **latest_url** (STRING): Civitai URL for the latest version of the model
- **image** (IMAGE): Preview image from Civitai

## Usage

Use to retrieve and display comprehensive model information from Civitai. The node queries Civitai's API using the model hash to fetch metadata, URLs, and preview images for documentation or workflow information display.

## Notes

- Requires internet connection to fetch data from Civitai
- Uses model hash to query Civitai API for model information
- Returns empty strings and blank image if model info is unavailable
- Handles exceptions gracefully by returning empty values
- The "latest_url" provides a link to the most recent version of the model
- Preview image is fetched from Civitai's image URLs
- Useful for model documentation and workflow metadata
