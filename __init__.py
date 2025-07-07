import os

# Import all node classes
from .nodes import *

# Import utility functions and objects
from .utils import cache, config_manager
from .utils.llm_wrapper import init_llm

# Initialize components
cache.load()
sage_styles = config_manager.styles_manager.data
llm_prompts = config_manager.prompts_manager.data
sage_config = config_manager.settings_manager.data

# Initialize LLM functionality
init_llm()

# Import LLM availability flags for conditional node registration
from .utils import llm_wrapper as llm

# Import server routes to register custom HTTP endpoints
try:
    from . import server_routes
except Exception as e:
    print(f"Warning: Failed to load SageUtils custom routes: {e}")

WEB_DIRECTORY = "./js"

# Currently, we have to have two mappings: one for the class names and one for the display names.
# I've broken them up into sections to make it easier to manage.
# 
# When the new node api is released, this information will be in the individual classes, and
# this will be obsolete.
#
# See: https://github.com/comfyanonymous/ComfyUI/tree/v3-definition
# and: https://github.com/comfyanonymous/ComfyUI/tree/v3-definition-wip
#
# v3 will require reimplementation of all nodes.

SELECTOR_CLASS_MAPPINGS = {
    "Sage_SamplerInfo": Sage_SamplerInfo,
    "Sage_AdvSamplerInfo": Sage_AdvSamplerInfo,
    "Sage_TilingInfo": Sage_TilingInfo,
    "Sage_ModelShifts": Sage_ModelShifts,
    "Sage_CheckpointSelector": Sage_CheckpointSelector,
    "Sage_UNETSelector": Sage_UNETSelector,
    "Sage_CLIPSelector": Sage_CLIPSelector,
    "Sage_DualCLIPSelector": Sage_DualCLIPSelector,
    "Sage_TripleCLIPSelector": Sage_TripleCLIPSelector,
    "Sage_QuadCLIPSelector": Sage_QuadCLIPSelector,
    "Sage_VAESelector": Sage_VAESelector,
    "Sage_UnetClipVaeToModelInfo": Sage_UnetClipVaeToModelInfo
}

TEXT_CLASS_MAPPINGS = {
    "Sage_SetText": Sage_SetText,
    "Sage_SaveText": Sage_SaveText,
    "SageSetWildcardText": SageSetWildcardText,
    "Sage_JoinText": Sage_JoinText,
    "Sage_TripleJoinText": Sage_TripleJoinText,
    "Sage_CleanText": Sage_CleanText,
    "Sage_TextWeight": Sage_TextWeight,
    "Sage_ViewAnything": Sage_ViewAnything,
    #"Sage_ViewNotes": Sage_ViewNotes,
    "Sage_PonyPrefix": Sage_PonyPrefix,
    "Sage_PonyStyle": Sage_PonyStyle,
    "Sage_HiDreamE1_Instruction": Sage_HiDreamE1_Instruction
}

LOADER_CLASS_MAPPINGS = {
    "Sage_LoadModelFromInfo": Sage_LoadModelFromInfo,
    "Sage_UNETLoaderFromInfo": Sage_UNETLoaderFromInfo,
    "Sage_CLIPLoaderFromInfo": Sage_CLIPLoaderFromInfo,
    "Sage_VAELoaderFromInfo": Sage_VAELoaderFromInfo,
    "Sage_LoraStackLoader": Sage_LoraStackLoader,
    "Sage_ModelLoraStackLoader": Sage_ModelLoraStackLoader
}

MODEL_CLASS_MAPPINGS = {
    "Sage_ModelInfo": Sage_ModelInfo,
    "Sage_LastLoraInfo": Sage_LastLoraInfo,
    "Sage_CheckLorasForUpdates": Sage_CheckLorasForUpdates,
    "Sage_CacheMaintenance": Sage_CacheMaintenance,
    "Sage_ModelReport": Sage_ModelReport,
    "Sage_MultiModelPicker": Sage_MultiModelPicker
}

LORA_CLASS_MAPPINGS = {
    "Sage_LoraStack": Sage_LoraStack,
    "Sage_QuickLoraStack": Sage_QuickLoraStack,
    "Sage_LoraStackRecent": Sage_LoraStackRecent,
    "Sage_TripleLoraStack": Sage_TripleLoraStack,
    "Sage_SixLoraStack": Sage_SixLoraStack,
    "Sage_TripleQuickLoraStack": Sage_TripleQuickLoraStack,
    "Sage_QuickSixLoraStack": Sage_QuickSixLoraStack,
    "Sage_QuickNineLoraStack": Sage_QuickNineLoraStack,
    "Sage_CollectKeywordsFromLoraStack": Sage_CollectKeywordsFromLoraStack
}

CLIP_CLASS_MAPPINGS = {
    "Sage_DualCLIPTextEncode": Sage_DualCLIPTextEncode,
    "Sage_DualCLIPTextEncodeLumina2": Sage_DualCLIPTextEncodeLumina2,
    "Sage_ConditioningZeroOut": Sage_ConditioningZeroOut
}

SAMPLER_CLASS_MAPPINGS = {
    "Sage_KSampler": Sage_KSampler,
    "Sage_KSamplerTiledDecoder": Sage_KSamplerTiledDecoder,
    "Sage_KSamplerAudioDecoder": Sage_KSamplerAudioDecoder
}

IMAGE_CLASS_MAPPINGS = {
    "Sage_LoadImage": Sage_LoadImage,
    "Sage_EmptyLatentImagePassthrough": Sage_EmptyLatentImagePassthrough,
    "Sage_SaveImageWithMetadata": Sage_SaveImageWithMetadata,
    "Sage_QuickResPicker": Sage_QuickResPicker,
    "Sage_GuessResolutionByRatio": Sage_GuessResolutionByRatio,
    "Sage_CubiqImageResize": Sage_CubiqImageResize,
    "Sage_ReferenceImage": Sage_ReferenceImage
}

METADATA_CLASS_MAPPINGS = {
    "Sage_ConstructMetadata": Sage_ConstructMetadata,
    "Sage_ConstructMetadataLite": Sage_ConstructMetadataLite
}

OLLAMA_CLASS_MAPPINGS = {
    "Sage_OllamaLLMPromptText": Sage_OllamaLLMPromptText,
    "Sage_OllamaLLMPromptVision": Sage_OllamaLLMPromptVision,
    "Sage_OllamaLLMPromptVisionRefine": Sage_OllamaLLMPromptVisionRefine
}

LMSTUDIO_CLASS_MAPPINGS = {
    "Sage_LMStudioLLMPromptVision": Sage_LMStudioLLMPromptVision,
    "Sage_LMStudioLLMPromptText": Sage_LMStudioLLMPromptText,
    "Sage_LMStudioLLMPromptVisionRefine": Sage_LMStudioLLMPromptVisionRefine
}

LLM_CLASS_MAPPINGS = {
    "Sage_ConstructLLMPrompt": Sage_ConstructLLMPrompt,
    "Sage_ConstructLLMPromptExtra": Sage_ConstructLLMPromptExtra
}

UTILITY_CLASS_MAPPINGS = {
    "Sage_GetFileHash": Sage_GetFileHash,
    "Sage_LogicalSwitch": Sage_LogicalSwitch,
    "Sage_Halt": Sage_Halt,
    "Sage_FreeMemory": Sage_FreeMemory
}

# Deprecated class mappings (correct spelling)
DEPRECATED_CLASS_MAPPINGS = {
    "Sage_KSamplerDecoder": Sage_KSamplerDecoder,
    "Sage_UNETLoader": Sage_UNETLoader,
    "Sage_CheckpointLoaderSimple": Sage_CheckpointLoaderSimple,
    "Sage_CheckpointLoaderRecent": Sage_CheckpointLoaderRecent
}

if llm.OLLAMA_AVAILABLE:
    LLM_CLASS_MAPPINGS = LLM_CLASS_MAPPINGS | OLLAMA_CLASS_MAPPINGS

if llm.LMSTUDIO_AVAILABLE:
     LLM_CLASS_MAPPINGS = LLM_CLASS_MAPPINGS | LMSTUDIO_CLASS_MAPPINGS

# A dictionary that contains all nodes you want to export with their names
# NOTE: names should be globally unique
NODE_CLASS_MAPPINGS = DEPRECATED_CLASS_MAPPINGS | UTILITY_CLASS_MAPPINGS | SELECTOR_CLASS_MAPPINGS |  TEXT_CLASS_MAPPINGS | \
    LOADER_CLASS_MAPPINGS| MODEL_CLASS_MAPPINGS | LORA_CLASS_MAPPINGS | CLIP_CLASS_MAPPINGS | SAMPLER_CLASS_MAPPINGS | \
    IMAGE_CLASS_MAPPINGS | METADATA_CLASS_MAPPINGS | LLM_CLASS_MAPPINGS


SELECTOR_NAME_MAPPINGS = {
    "Sage_SamplerInfo": "Sampler Info",
    "Sage_AdvSamplerInfo": "Adv Sampler Info",
    "Sage_TilingInfo": "Tiling Info",
    "Sage_ModelShifts": "Model Shifts",
    "Sage_CheckpointSelector": "Checkpoint Selector",
    "Sage_UNETSelector": "UNET Selector",
    "Sage_CLIPSelector": "CLIP Selector",
    "Sage_DualCLIPSelector": "Dual CLIP Selector",
    "Sage_TripleCLIPSelector": "Triple CLIP Selector",
    "Sage_QuadCLIPSelector": "Quad CLIP Selector",
    "Sage_VAESelector": "VAE Selector",
    "Sage_UnetClipVaeToModelInfo": "UNET + CLIP + VAE to Model Info"
}

TEXT_NAME_MAPPINGS = {
    "Sage_SetText": "Set Text",
    "Sage_SaveText": "Save Text",
    "SageSetWildcardText": "Set Text (Wildcards)",
    "Sage_JoinText": "Join Text",
    "Sage_TripleJoinText": "Join Text x3",
    "Sage_CleanText": "Clean Text",
    "Sage_TextWeight": "Text Weight",
    "Sage_ViewAnything": "View Any Node as Text",
    #"Sage_ViewNotes": "View Notes",
    "Sage_PonyPrefix": "Add Pony v6 Prefixes",
    "Sage_PonyStyle": "Add Pony Style",
    "Sage_HiDreamE1_Instruction": "HiDreamE1 Instruction"
}

LOADER_NAME_MAPPINGS = {
    "Sage_LoadModelFromInfo": "Load Model from Info",
    "Sage_UNETLoaderFromInfo": "Load UNET Model from Info",
    "Sage_CLIPLoaderFromInfo": "Load CLIP Model from Info",
    "Sage_VAELoaderFromInfo": "Load VAE Model from Info",
    "Sage_LoraStackLoader": "Lora Stack Loader",
    "Sage_ModelLoraStackLoader": "Model + Lora Stack Loader"
}

MODEL_NAME_MAPPINGS = {
    "Sage_ModelInfo": "Pull Model Info",
    "Sage_LastLoraInfo": "Last Lora Info",
    "Sage_CollectKeywordsFromLoraStack": "Lora Stack -> Keywords",
    "Sage_CheckLorasForUpdates": "Check Loras for Updates",
    "Sage_CacheMaintenance": "Cache Maintenance",
    "Sage_ModelReport": "Model Scan & Report",
    "Sage_MultiModelPicker": "Multi Model Picker"
}

LORA_NAME_MAPPINGS = {
    "Sage_LoraStack": "Simple Lora Stack",
    "Sage_QuickLoraStack": "Quick Lora Stack",
    "Sage_TripleLoraStack": "Lora Stack (x3)",
    "Sage_SixLoraStack": "Lora Stack (x6)",
    "Sage_TripleQuickLoraStack": "Quick Lora Stack (x3)",
    "Sage_QuickSixLoraStack": "Quick Lora Stack (x6)",
    "Sage_QuickNineLoraStack": "Quick Lora Stack (x9)"
}

CLIP_NAME_MAPPINGS = {
    "Sage_DualCLIPTextEncode": "Dual Prompt Encode",
    "Sage_DualCLIPTextEncodeLumina2": "Dual Prompt Encode (Lumina 2)",
    "Sage_ConditioningZeroOut": "Zero Conditioning"
}

SAMPLER_NAME_MAPPINGS = {
    "Sage_KSampler": "KSampler w/ Sampler Info",
    "Sage_KSamplerTiledDecoder": "KSampler + Tiled Decoder",
    "Sage_KSamplerAudioDecoder": "KSampler + Audio Decoder"
}

IMAGE_NAME_MAPPINGS = {
    "Sage_EmptyLatentImagePassthrough": "Empty Latent Passthrough",
    "Sage_LoadImage": "Load Image w/ Size & Metadata",
    "Sage_SaveImageWithMetadata": "Save Image w/ Added Metadata",
    "Sage_QuickResPicker": "Quick Resolution Picker",
    "Sage_GuessResolutionByRatio": "Guess Close Resolution by Ratio",
    "Sage_CubiqImageResize": "Image Resize (from Essentials)",
    "Sage_ReferenceImage": "Reference Image"
}

METADATA_NAME_MAPPINGS = {
    "Sage_ConstructMetadata": "Construct Metadata",
    "Sage_ConstructMetadataLite": "Construct Metadata Lite"
}

OLLAMA_NAME_MAPPINGS = {
    "Sage_OllamaLLMPromptText": "Ollama LLM Prompt (Text)",
    "Sage_OllamaLLMPromptVision": "Ollama LLM Prompt (Vision)",
    "Sage_OllamaLLMPromptVisionRefine": "Ollama LLM Prompt (Vision) Refined"
}

LMSTUDIO_NAME_MAPPINGS = {
    "Sage_LMStudioLLMPromptVision": "LM Studio LLM Prompt (Vision)",
    "Sage_LMStudioLLMPromptText": "LM Studio LLM Prompt (Text)",
    "Sage_LMStudioLLMPromptVisionRefine": "LM Studio LLM Prompt (Vision) Refined"
}

LLM_NAME_MAPPINGS = {
    "Sage_ConstructLLMPrompt": "Construct LLM Prompt",
    "Sage_ConstructLLMPromptExtra": "Construct LLM Prompt Extra"
}

UTILITY_NAME_MAPPINGS = {
    "Sage_GetFileHash": "Get Sha256 Hash",
    "Sage_LogicalSwitch": "Switch",
    "Sage_Halt": "Halt Workflow",
    "Sage_FreeMemory": "Free Memory"
}

# Deprecated name mappings (correct spelling)
DEPRECATED_NAME_MAPPINGS = {
    "Sage_KSamplerDecoder": "KSampler + Decoder",
    "Sage_UNETLoader": "Load UNET Model",
    "Sage_CheckpointLoaderSimple": "Load Checkpoint w/ Metadata",
    "Sage_CheckpointLoaderRecent": "Load Recently Used Checkpoint",
    "Sage_LoraStackRecent": "Recent Lora Stack"
}

if llm.OLLAMA_AVAILABLE:
    LLM_NAME_MAPPINGS = LLM_NAME_MAPPINGS | OLLAMA_NAME_MAPPINGS

if llm.LMSTUDIO_AVAILABLE:
    LLM_NAME_MAPPINGS = LLM_NAME_MAPPINGS | LMSTUDIO_NAME_MAPPINGS

# A dictionary that contains the friendly/human readable titles for the nodes
NODE_DISPLAY_NAME_MAPPINGS = DEPRECATED_NAME_MAPPINGS | UTILITY_NAME_MAPPINGS | SELECTOR_NAME_MAPPINGS | TEXT_NAME_MAPPINGS | \
    LOADER_NAME_MAPPINGS | MODEL_NAME_MAPPINGS | LORA_NAME_MAPPINGS | CLIP_NAME_MAPPINGS | SAMPLER_NAME_MAPPINGS | \
    IMAGE_NAME_MAPPINGS | METADATA_NAME_MAPPINGS | LLM_NAME_MAPPINGS

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS', 'WEB_DIRECTORY']
