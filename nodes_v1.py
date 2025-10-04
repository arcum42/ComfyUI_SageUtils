
from .utils.performance_timer import log_init

# Import all node classes
from .nodes import *
log_init("V1_NODES_IMPORTED")


# Currently, we have to have two mappings: one for the class names and one for the display names.
# I've broken them up into sections to make it easier to manage.
#
# See: https://github.com/comfyanonymous/ComfyUI/tree/v3-definition
# and: https://github.com/comfyanonymous/ComfyUI/tree/v3-definition-wip
#
# v3 will require reimplementation of all nodes, and has you register a ComfyExtension instead.
# If you use the mappings below, it skips the check for ComfyExtension, and you can't use ComfyExtension
# to register non-v3 nodes.
# This makes converting to v3 all or nothing, and with the number of nodes here, it's easier to wait on v3.
# See load_custom_node in comfyui/nodes.py for how nodes are loaded.

SELECTOR_CLASS_MAPPINGS = {
    "Sage_TilingInfo": Sage_TilingInfo,
    "Sage_ModelShifts": Sage_ModelShifts,
    "Sage_FreeU2": Sage_FreeU2,
    "Sage_ModelShiftOnly": Sage_ModelShiftOnly,
    "Sage_CheckpointSelector": Sage_CheckpointSelector,
    "Sage_UNETSelector": Sage_UNETSelector,
    "Sage_CLIPSelector": Sage_CLIPSelector,
    "Sage_DualCLIPSelector": Sage_DualCLIPSelector,
    "Sage_TripleCLIPSelector": Sage_TripleCLIPSelector,
    "Sage_QuadCLIPSelector": Sage_QuadCLIPSelector,
    "Sage_VAESelector": Sage_VAESelector,
    "Sage_UnetClipVaeToModelInfo": Sage_UnetClipVaeToModelInfo,
    "Sage_MultiSelectorSingleClip": Sage_MultiSelectorSingleClip,
    "Sage_MultiSelectorDoubleClip": Sage_MultiSelectorDoubleClip,
    "Sage_MultiSelectorTripleClip": Sage_MultiSelectorTripleClip,
    "Sage_MultiSelectorQuadClip": Sage_MultiSelectorQuadClip
}

TEXT_CLASS_MAPPINGS = {
    "Sage_SetText": Sage_SetText,
    "Sage_SetTextWithInt": Sage_SetTextWithInt,
    "Sage_TextSwitch": Sage_TextSwitch,
    "SageSetWildcardText": SageSetWildcardText,
    "Sage_TextSubstitution": Sage_TextSubstitution,
    "Sage_JoinText": Sage_JoinText,
    "Sage_TripleJoinText": Sage_TripleJoinText,
    "Sage_CleanText": Sage_CleanText,
    "Sage_TextSelectLine": Sage_TextSelectLine,
    "Sage_TextRandomLine": Sage_TextRandomLine,
    "Sage_TextWeight": Sage_TextWeight,
    "Sage_IntToStr": Sage_IntToStr,
    "Sage_FloatToStr": Sage_FloatToStr,
    "Sage_ViewAnything": Sage_ViewAnything,
    "Sage_ViewNotes": Sage_ViewNotes,
    "Sage_SaveText": Sage_SaveText,
    "Sage_PonyPrefix": Sage_PonyPrefix,
    "Sage_PonyStyle": Sage_PonyStyle,
    "Sage_HiDreamE1_Instruction": Sage_HiDreamE1_Instruction
}

LOADER_CLASS_MAPPINGS = {
    "Sage_LoadModelFromInfo": Sage_LoadModelFromInfo,
    "Sage_UNETLoaderFromInfo": Sage_UNETLoaderFromInfo,
    "Sage_CLIPLoaderFromInfo": Sage_CLIPLoaderFromInfo,
    "Sage_ChromaCLIPLoaderFromInfo": Sage_ChromaCLIPLoaderFromInfo,
    "Sage_VAELoaderFromInfo": Sage_VAELoaderFromInfo,
    "Sage_LoraStackLoader": Sage_LoraStackLoader,
    "Sage_ModelLoraStackLoader": Sage_ModelLoraStackLoader,
    "Sage_UNETLoRALoader": Sage_UNETLoRALoader,
}

MODEL_CLASS_MAPPINGS = {
    "Sage_ModelInfo": Sage_ModelInfo,
    "Sage_ModelInfoDisplay": Sage_ModelInfoDisplay,
    "Sage_LastLoraInfo": Sage_LastLoraInfo,
    "Sage_CheckLorasForUpdates": Sage_CheckLorasForUpdates,
    "Sage_CacheMaintenance": Sage_CacheMaintenance,
    "Sage_ModelReport": Sage_ModelReport,
    "Sage_MultiModelPicker": Sage_MultiModelPicker
}

LORA_CLASS_MAPPINGS = {
    "Sage_LoraStack": Sage_LoraStack,
    "Sage_QuickLoraStack": Sage_QuickLoraStack,
    "Sage_TripleLoraStack": Sage_TripleLoraStack,
    "Sage_SixLoraStack": Sage_SixLoraStack,
    "Sage_TripleQuickLoraStack": Sage_TripleQuickLoraStack,
    "Sage_QuickSixLoraStack": Sage_QuickSixLoraStack,
    "Sage_QuickNineLoraStack": Sage_QuickNineLoraStack,
    "Sage_CollectKeywordsFromLoraStack": Sage_CollectKeywordsFromLoraStack,
    "Sage_LoraStackInfoDisplay": Sage_LoraStackInfoDisplay
}

CLIP_CLASS_MAPPINGS = {
    "Sage_SingleCLIPTextEncode": Sage_SingleCLIPTextEncode,
    "Sage_DualCLIPTextEncode": Sage_DualCLIPTextEncode,
    "Sage_DualCLIPTextEncodeLumina2": Sage_DualCLIPTextEncodeLumina2,
    "Sage_DualCLIPTextEncodeQwen": Sage_DualCLIPTextEncodeQwen,
    "Sage_ConditioningZeroOut": Sage_ConditioningZeroOut
}

SAMPLER_CLASS_MAPPINGS = {
    "Sage_SamplerInfo": Sage_SamplerInfo,
    "Sage_AdvSamplerInfo": Sage_AdvSamplerInfo,
    "Sage_SamplerSelector": Sage_SamplerSelector,
    "Sage_SchedulerSelector": Sage_SchedulerSelector,
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
    "Sage_CropImage": Sage_CropImage,
    "Sage_ReferenceImage": Sage_ReferenceImage
}

TRAINING_CLASS_MAPPINGS = {
    #"Sage_LoadImageTextSetFromFolderNode": Sage_LoadImageTextSetFromFolderNode,
    "Sage_Load_Dataset_From_Folder": Sage_Load_Dataset_From_Folder,
    "Sage_TrainingCaptionsToConditioning": Sage_TrainingCaptionsToConditioning
}

METADATA_CLASS_MAPPINGS = {
    "Sage_ConstructMetadata": Sage_ConstructMetadata,
    "Sage_ConstructMetadataLite": Sage_ConstructMetadataLite,
    "Sage_ConstructMetadataFlexible": Sage_ConstructMetadataFlexible
}

OLLAMA_CLASS_MAPPINGS = {
    "Sage_OllamaAdvancedOptions": Sage_OllamaAdvancedOptions,
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

# A dictionary that contains all nodes you want to export with their names
# NOTE: names should be globally unique
NODE_CLASS_MAPPINGS = UTILITY_CLASS_MAPPINGS | SELECTOR_CLASS_MAPPINGS |  TEXT_CLASS_MAPPINGS | \
    LOADER_CLASS_MAPPINGS| MODEL_CLASS_MAPPINGS | LORA_CLASS_MAPPINGS | CLIP_CLASS_MAPPINGS | SAMPLER_CLASS_MAPPINGS | \
    IMAGE_CLASS_MAPPINGS | METADATA_CLASS_MAPPINGS

SELECTOR_NAME_MAPPINGS = {
    "Sage_TilingInfo": "Tiling Info",
    "Sage_ModelShifts": "Model Shifts",
    "Sage_FreeU2": "Free U2 Selector",
    "Sage_ModelShiftOnly": "Model Shift Only",
    "Sage_CheckpointSelector": "Checkpoint Selector",
    "Sage_UNETSelector": "UNET Selector",
    "Sage_CLIPSelector": "CLIP Selector",
    "Sage_DualCLIPSelector": "Dual CLIP Selector",
    "Sage_TripleCLIPSelector": "Triple CLIP Selector",
    "Sage_QuadCLIPSelector": "Quad CLIP Selector",
    "Sage_VAESelector": "VAE Selector",
    "Sage_UnetClipVaeToModelInfo": "UNET + CLIP + VAE",
    "Sage_MultiSelectorSingleClip": "Multi Selector (Single CLIP)",
    "Sage_MultiSelectorDoubleClip": "Multi Selector (Dual CLIP)",
    "Sage_MultiSelectorTripleClip": "Multi Selector (Triple CLIP)",
    "Sage_MultiSelectorQuadClip": "Multi Selector (Quad CLIP)"
}

TEXT_NAME_MAPPINGS = {
    "Sage_SetText": "Set Text",
    "Sage_SetTextWithInt": "Text w/ Int",
    "Sage_TextSwitch": "Text Switch",
    "SageSetWildcardText": "Set Text (Wildcards)",
    "Sage_TextSubstitution": "Text Substitution",
    "Sage_JoinText": "Join Text",
    "Sage_TripleJoinText": "Join Text x3",
    "Sage_CleanText": "Clean Text",
    "Sage_TextSelectLine": "Select Line from Text",
    "Sage_TextRandomLine": "Random Line from Text",
    "Sage_TextWeight": "Text Weight",
    "Sage_IntToStr": "Int to String",
    "Sage_FloatToStr": "Float to String",
    "Sage_ViewAnything": "View Any Node as Text",
    "Sage_ViewNotes": "View Notes",
    "Sage_SaveText": "Save Text",
    "Sage_PonyPrefix": "Add Pony v6 Prefixes",
    "Sage_PonyStyle": "Add Pony Style",
    "Sage_HiDreamE1_Instruction": "HiDreamE1 Instruction"
}

LOADER_NAME_MAPPINGS = {
    "Sage_LoadModelFromInfo": "Load Models",
    "Sage_ModelLoraStackLoader": "Load Models + Loras",
    "Sage_UNETLoaderFromInfo": "Load UNET Model <- Info",
    "Sage_CLIPLoaderFromInfo": "Load CLIP Model <- Info",
    "Sage_ChromaCLIPLoaderFromInfo": "Load CLIP (w/ Chroma T5 Options)",
    "Sage_VAELoaderFromInfo": "Load VAE Model <- Info",
    "Sage_LoraStackLoader": "Lora Stack Loader",
    "Sage_UNETLoRALoader": "Load UNET + LoRA (Model Only)"
}

MODEL_NAME_MAPPINGS = {
    "Sage_ModelInfo": "Pull Model Info",
    "Sage_ModelInfoDisplay": "Display Model Info",
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
    "Sage_QuickNineLoraStack": "Quick Lora Stack (x9)",
    "Sage_LoraStackInfoDisplay": "Display LoRA Stack Info"
}

CLIP_NAME_MAPPINGS = {
    "Sage_SingleCLIPTextEncode": "Text Encode",
    "Sage_DualCLIPTextEncode": "Dual Prompt Encode",
    "Sage_DualCLIPTextEncodeLumina2": "Dual Prompt Encode (Lumina 2)",
    "Sage_DualCLIPTextEncodeQwen": "Dual Prompt Encode (Qwen Image Edit)",
    "Sage_ConditioningZeroOut": "Zero Conditioning"
}

SAMPLER_NAME_MAPPINGS = {
    "Sage_SamplerInfo": "KSampler Info",
    "Sage_AdvSamplerInfo": "Adv KSampler Info",
    "Sage_SamplerSelector": "Sampler Selector",
    "Sage_SchedulerSelector": "Scheduler Selector",
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
    "Sage_CropImage": "Sage Image Crop",
    "Sage_ReferenceImage": "Reference Image"
}

TRAINING_NAME_MAPPINGS = {
    #"Sage_LoadImageTextSetFromFolderNode": "Load Image(s) from Folder (Set Text)",
    "Sage_Load_Dataset_From_Folder": "Load Dataset from Folder",
    "Sage_TrainingCaptionsToConditioning": "Captions to Conditioning"
}

METADATA_NAME_MAPPINGS = {
    "Sage_ConstructMetadata": "Construct Metadata",
    "Sage_ConstructMetadataLite": "Construct Metadata Lite",
    "Sage_ConstructMetadataFlexible": "Construct Metadata (Flexible)"
}

OLLAMA_NAME_MAPPINGS = {
    "Sage_OllamaAdvancedOptions": "Ollama Advanced Options",
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

# A dictionary that contains the friendly/human readable titles for the nodes
NODE_DISPLAY_NAME_MAPPINGS = UTILITY_NAME_MAPPINGS | SELECTOR_NAME_MAPPINGS | TEXT_NAME_MAPPINGS | \
    LOADER_NAME_MAPPINGS | MODEL_NAME_MAPPINGS | LORA_NAME_MAPPINGS | CLIP_NAME_MAPPINGS | SAMPLER_NAME_MAPPINGS | \
    IMAGE_NAME_MAPPINGS | METADATA_NAME_MAPPINGS
