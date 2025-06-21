# Sage_OllamaLLMPromptVisionRefine

## Description

An advanced Ollama LLM node that provides refined vision-based prompt generation with two-stage processing. This node first generates an initial description using a vision model, then refines that description using a separate text model for enhanced quality and detail.

## Inputs

- **prompt** (STRING): Initial prompt for the vision model (default: detailed image description prompt)
- **model** (COMBO): Available Ollama vision model for initial analysis
- **image** (IMAGE): The input image to analyze
- **seed** (INT): Random seed for the initial vision model (0 to 2^32-1)
- **refine_prompt** (STRING): Prompt for refining the initial description (default: rewrite to be more vivid and detailed)
- **refine_model** (COMBO): Available Ollama text model for refinement
- **refine_seed** (INT): Random seed for the refinement model (0 to 2^32-1)

## Outputs

- **initial_response** (STRING): The original response from the vision model
- **refined_response** (STRING): The enhanced response after refinement

## Two-Stage Processing

- **Stage 1**: Vision model analyzes the image using the initial prompt
- **Stage 2**: Text model refines the vision output using the refine prompt
- **Dual seeding**: Separate seeds for reproducible results in both stages
- **Model flexibility**: Can use different models for vision and refinement tasks

## Usage

This node is perfect for:

- Creating high-quality prompt descriptions from images with iterative improvement
- Generating detailed image analysis that's then enhanced for clarity and engagement
- Building sophisticated prompts through a two-model approach
- Achieving consistent, reproducible results with separate seeding control

## Workflow Example

1. Vision model (e.g., llava:13b) analyzes image with initial prompt
2. Text model (e.g., llama3:8b) refines the description for better quality
3. Both responses are output for comparison or further processing

## Supported Models

**Vision Models** (for initial analysis):
- **LLaVA variants**: llava:7b, llava:13b, llava:34b
- **Bakllava**: bakllava:7b
- **Other vision models**: As available in your Ollama installation

**Text Models** (for refinement):
- **Llama variants**: llama3:8b, llama3:70b, llama2:7b
- **Mistral variants**: mistral:7b, mixtral:8x7b
- **Other text models**: As available in your Ollama installation

## Notes

- Requires Ollama to be running with both vision and text models installed
- The refinement stage processes the initial vision response, not the original image
- Separate seeds allow for reproducible results while maintaining flexibility
- Choose vision models based on image analysis quality, text models based on writing capability
- Default refine prompt encourages more vivid and detailed descriptions while preserving meaning
