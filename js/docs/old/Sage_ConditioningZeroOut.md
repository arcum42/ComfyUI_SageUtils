# Sage_ConditioningZeroOut

**Zero Conditioning**

Outputs zeroed conditioning for advanced prompt control and neutral conditioning creation.

## Inputs

### Required

- **clip** (CLIP): The CLIP model used for encoding

## Outputs

- **CONDITIONING**: Zeroed out conditioning with null embeddings and pooled output

## Usage

Use to reset or neutralize conditioning in prompt workflows. Creates a completely neutral conditioning that has no influence on generation.

## Notes

- Creates empty token conditioning using the provided CLIP model
- Both the main conditioning tensor and pooled output are zeroed
- Useful for creating neutral baselines or negative conditioning
- Part of "Sage Utils/clip" category for conditioning operations
- Can be used as a neutral starting point for conditioning mathematics
- Helpful in advanced prompt blending and conditioning manipulation workflows
