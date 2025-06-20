import os

from .nodes import *
from .utils import *
from .utils.llm_wrapper import init_llm

cache.load()
sage_styles = config_manager.styles_manager.data
llm_prompts = config_manager.prompts_manager.data
sage_config = config_manager.settings_manager.data

# Call LLM init functions

init_llm()

WEB_DIRECTORY = "./js"

# Deprecated class mappings (correct spelling)
DEPRECATED_CLASS_MAPPINGS = {
    "Sage_KSamplerDecoder": Sage_KSamplerDecoder
}

UTILITY_CLASS_MAPPINGS = {
    "Sage_GetFileHash": Sage_GetFileHash,
    "Sage_LogicalSwitch": Sage_LogicalSwitch,
    "Sage_QuickResPicker": Sage_QuickResPicker
}

SETTINGS_CLASS_MAPPINGS = {
    "Sage_SamplerInfo": Sage_SamplerInfo,
    "Sage_AdvSamplerInfo": Sage_AdvSamplerInfo,
    "Sage_TilingInfo": Sage_TilingInfo,
    "Sage_ModelShifts": Sage_ModelShifts
}

TEXT_CLASS_MAPPINGS = {
    "Sage_SetText": Sage_SetText,
    "Sage_JoinText": Sage_JoinText,
    "Sage_TripleJoinText": Sage_TripleJoinText,
    "Sage_CleanText": Sage_CleanText,
    "Sage_TextWeight": Sage_TextWeight,
    "Sage_ViewAnything": Sage_ViewAnything,
    "Sage_PonyPrefix": Sage_PonyPrefix,
    "Sage_PonyStyle": Sage_PonyStyle,
    "Sage_HiDreamE1_Instruction": Sage_HiDreamE1_Instruction
}

MODEL_CLASS_MAPPINGS = {
    "Sage_CheckpointSelector": Sage_CheckpointSelector,
    "Sage_UNETLoader": Sage_UNETLoader,
    "Sage_CheckpointLoaderSimple": Sage_CheckpointLoaderSimple,
    "Sage_CheckpointLoaderRecent": Sage_CheckpointLoaderRecent,
    "Sage_ModelInfo": Sage_ModelInfo,
    "Sage_CacheMaintenance": Sage_CacheMaintenance,
    "Sage_ModelReport": Sage_ModelReport,
    "Sage_ModelLoraStackLoader": Sage_ModelLoraStackLoader,
    "Sage_MultiModelPicker": Sage_MultiModelPicker
}

LORA_CLASS_MAPPINGS = {
    "Sage_LoraStack": Sage_LoraStack,
    "Sage_LoraStackRecent": Sage_LoraStackRecent,
    "Sage_TripleLoraStack": Sage_TripleLoraStack,
    "Sage_LoraStackLoader": Sage_LoraStackLoader,
    "Sage_CollectKeywordsFromLoraStack": Sage_CollectKeywordsFromLoraStack,
    "Sage_LastLoraInfo": Sage_LastLoraInfo,
    "Sage_CheckLorasForUpdates": Sage_CheckLorasForUpdates
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
    "Sage_SaveImageWithMetadata": Sage_SaveImageWithMetadata
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

if llm.OLLAMA_AVAILABLE:
    LLM_CLASS_MAPPINGS = LLM_CLASS_MAPPINGS | OLLAMA_CLASS_MAPPINGS

if llm.LMSTUDIO_AVAILABLE:
     LLM_CLASS_MAPPINGS = LLM_CLASS_MAPPINGS | LMSTUDIO_CLASS_MAPPINGS

# A dictionary that contains all nodes you want to export with their names
# NOTE: names should be globally unique
NODE_CLASS_MAPPINGS = DEPRECATED_CLASS_MAPPINGS | UTILITY_CLASS_MAPPINGS | SETTINGS_CLASS_MAPPINGS |  TEXT_CLASS_MAPPINGS | \
    MODEL_CLASS_MAPPINGS | LORA_CLASS_MAPPINGS | CLIP_CLASS_MAPPINGS | SAMPLER_CLASS_MAPPINGS | IMAGE_CLASS_MAPPINGS | \
    METADATA_CLASS_MAPPINGS | LLM_CLASS_MAPPINGS


# Deprecated name mappings (correct spelling)
DEPRECATED_NAME_MAPPINGS = {
    "Sage_KSamplerDecoder": "KSampler + Decoder"
}

UTILITY_NAME_MAPPINGS = {
    "Sage_GetFileHash": "Get Sha256 Hash",
    "Sage_LogicalSwitch": "Switch",
    "Sage_QuickResPicker": "Quick Resolution Picker"
}

SETTINGS_NAME_MAPPINGS = {
    "Sage_SamplerInfo": "Sampler Info",
    "Sage_AdvSamplerInfo": "Adv Sampler Info",
    "Sage_TilingInfo": "Tiling Info",
    "Sage_ModelShifts": "Model Shifts"
}

TEXT_NAME_MAPPINGS = {
    "Sage_SetText": "Set Text",
    "Sage_JoinText": "Join Text",
    "Sage_TripleJoinText": "Join Text x3",
    "Sage_CleanText": "Clean Text",
    "Sage_TextWeight": "Text Weight",
    "Sage_ViewAnything": "View Any Node as Text",
    "Sage_PonyPrefix": "Add Pony v6 Prefixes",
    "Sage_PonyStyle": "Add Pony Style",
    "Sage_HiDreamE1_Instruction": "HiDreamE1 Instruction"
}

MODEL_NAME_MAPPINGS = {
    "Sage_CheckpointSelector": "Checkpoint Selector", #
    "Sage_UNETLoader": "Load Diffusion Model w/ Metadata",
    "Sage_CheckpointLoaderSimple": "Load Checkpoint w/ Metadata",
    "Sage_CheckpointLoaderRecent": "Load Recently Used Checkpoint",
    "Sage_ModelInfo": "Model Info",
    "Sage_CacheMaintenance": "Cache Maintenance",
    "Sage_ModelReport": "Model Scan & Report",
    "Sage_ModelLoraStackLoader": "Model + Lora Stack Loader",
    "Sage_MultiModelPicker": "Multi Model Picker"
}

LORA_NAME_MAPPINGS = {
    "Sage_LoraStack": "Simple Lora Stack",
    "Sage_LoraStackRecent": "Recent Lora Stack",
    "Sage_TripleLoraStack": "Triple Lora Stack",
    "Sage_LoraStackLoader": "Lora Stack Loader",
    "Sage_CollectKeywordsFromLoraStack": "Lora Stack -> Keywords",
    "Sage_LastLoraInfo": "Last Lora Info",
    "Sage_CheckLorasForUpdates": "Check Loras for Updates"
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
    "Sage_SaveImageWithMetadata": "Save Image w/ Added Metadata"
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

if llm.OLLAMA_AVAILABLE:
    LLM_NAME_MAPPINGS = LLM_NAME_MAPPINGS | OLLAMA_NAME_MAPPINGS

if llm.LMSTUDIO_AVAILABLE:
    LLM_NAME_MAPPINGS = LLM_NAME_MAPPINGS | LMSTUDIO_NAME_MAPPINGS

# A dictionary that contains the friendly/humanly readable titles for the nodes
NODE_DISPLAY_NAME_MAPPINGS = DEPRECATED_NAME_MAPPINGS | UTILITY_NAME_MAPPINGS | SETTINGS_NAME_MAPPINGS | TEXT_NAME_MAPPINGS | \
    MODEL_NAME_MAPPINGS | LORA_NAME_MAPPINGS | CLIP_NAME_MAPPINGS | SAMPLER_NAME_MAPPINGS | IMAGE_NAME_MAPPINGS | \
    METADATA_NAME_MAPPINGS | LLM_NAME_MAPPINGS

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS', 'WEB_DIRECTORY']
