# Sage_MultiModelPicker

**Multi Model Picker**

Picks a model from a list of model_info inputs based on an index selection.

## Inputs

### Required

- **index** (INT): Selects which model to pick from the list of available models (default: 1, range: 1-100)

### Optional

- **model_info_1, model_info_2, etc.** (MODEL_INFO): Multiple model_info inputs to choose from

## Outputs

- **model_info** (MODEL_INFO): The selected model_info output

## Usage

Use to build workflows that require dynamic model selection from multiple options. Connect multiple model_info outputs to this node and use the index to select which one to use.

## Notes

- Index is 1-based (first model is index 1, not 0)
- Supports up to 100 model inputs (arbitrary limit)
- Raises an error if index is out of range
- Useful for A/B testing different models or conditional model switching
- All connected model_info inputs are automatically detected
