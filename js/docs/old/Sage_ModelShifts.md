# Sage_ModelShifts

**Model Shifts**

Configures model shift parameters and FreeU v2 settings for advanced model modifications.

## Inputs

### Required

- **shift_type** (STRING): The type of shift to apply to the model - "None", "x1", or "x1000" (x1 for most models, x1000 for Auraflow and Lumina2)
- **shift** (FLOAT): The shift value to apply (default: 3.0, range: 0.0-100.0)
- **freeu_v2** (BOOLEAN): Whether to enable FreeU v2 (default: False)
- **b1** (FLOAT): FreeU v2 backbone factor 1 (default: 1.3, range: 0.0-10.0)
- **b2** (FLOAT): FreeU v2 backbone factor 2 (default: 1.4, range: 0.0-10.0)
- **s1** (FLOAT): FreeU v2 skip factor 1 (default: 0.9, range: 0.0-10.0)
- **s2** (FLOAT): FreeU v2 skip factor 2 (default: 0.2, range: 0.0-10.0)

## Outputs

- **model_shifts** (MODEL_SHIFTS): Configuration object containing all shift and FreeU settings

## Usage

Use in workflows that require dynamic model parameter adjustment. Connect to LoRA Stack Loader or Model LoRA Stack Loader nodes.

## Notes

- Model shifts adjust sampling parameters for different model architectures
- x1 shift type uses 1000.0 multiplier (for most models)
- x1000 shift type uses 1.0 multiplier (for Auraflow and Lumina2)
- FreeU v2 can improve generation quality with proper parameter tuning
- Settings are passed to model loader nodes for application
- "None" shift type disables model shifting
- Used by the model loader node for advanced model modifications
- Part of the "Sage Utils/model" category despite being in lora.py
