import os

from .nodes import *
from .utils import *

cache.cache.load()
styles.load_styles()

WEB_DIRECTORY = "./js"

# A dictionary that contains all nodes you want to export with their names
# NOTE: names should be globally unique
NODE_CLASS_MAPPINGS = {
    # Primitive nodes
    "Sage_SetBool": Sage_SetBool,
    "Sage_SetInteger": Sage_SetInteger,
    "Sage_SetFloat": Sage_SetFloat,

    # Logic nodes
    "Sage_LogicalSwitch": Sage_LogicalSwitch,
    "Sage_TextCompare": Sage_TextCompare,

    # Text nodes
    "Sage_SetText": Sage_SetText,
    "Sage_JoinText": Sage_JoinText,
    "Sage_TripleJoinText": Sage_TripleJoinText,
    "Sage_CleanText": Sage_CleanText,
    "Sage_ViewText": Sage_ViewText,
    "Sage_ViewAnything": Sage_ViewAnything,
    "Sage_PonyPrefix": Sage_PonyPrefix,

    # Model nodes
    "Sage_UNETLoader": Sage_UNETLoader,
    "Sage_CheckpointLoaderSimple": Sage_CheckpointLoaderSimple,
    "Sage_CheckpointLoaderRecent": Sage_CheckpointLoaderRecent,
    "Sage_ModelInfo": Sage_ModelInfo,
    "Sage_CacheMaintenance": Sage_CacheMaintenance,
    "Sage_ModelReport": Sage_ModelReport,
    "Sage_ModelLoraStackLoader": Sage_ModelLoraStackLoader,

    # Lora stack nodes
    "Sage_LoraStack": Sage_LoraStack,
    "Sage_LoraStackRecent": Sage_LoraStackRecent,
    "Sage_TripleLoraStack": Sage_TripleLoraStack,
    "Sage_LoraStackLoader": Sage_LoraStackLoader,
    "Sage_CollectKeywordsFromLoraStack": Sage_CollectKeywordsFromLoraStack,
    "Sage_LastLoraInfo": Sage_LastLoraInfo,

    # Clip nodes
    "Sage_DualCLIPTextEncode": Sage_DualCLIPTextEncode,
    "Sage_DualCLIPTextEncodeLumina2": Sage_DualCLIPTextEncodeLumina2,
    "Sage_ConditioningZeroOut": Sage_ConditioningZeroOut,
    #"Sage_ConditioningOneOut": Sage_ConditioningZeroOut,
    "Sage_ConditioningRngOut": Sage_ConditioningRngOut,

    # Sampler nodes
    "Sage_KSampler": Sage_KSampler,
    "Sage_KSamplerDecoder": Sage_KSamplerDecoder,
    "Sage_KSamplerTiledDecoder": Sage_KSamplerTiledDecoder,

    # Image nodes
    "Sage_LoadImage": Sage_LoadImage,
    "Sage_EmptyLatentImagePassthrough": Sage_EmptyLatentImagePassthrough,
    "Sage_SaveImageWithMetadata": Sage_SaveImageWithMetadata,

    # Metadata nodes
    "Sage_SamplerInfo": Sage_SamplerInfo,
    "Sage_AdvSamplerInfo": Sage_AdvSamplerInfo,
    "Sage_TilingInfo": Sage_TilingInfo,
    "Sage_ConstructMetadata": Sage_ConstructMetadata,
    "Sage_ConstructMetadataLite": Sage_ConstructMetadataLite,

    # Utility nodes
    "Sage_GetFileHash": Sage_GetFileHash,
    "Sage_CheckpointInfoOnly": Sage_CheckpointInfoOnly, #
    
    # Test nodes
    "Sage_Foobar": Sage_Foobar#,
    #"Sage_StringListTest": Sage_StringListTest

}

# A dictionary that contains the friendly/humanly readable titles for the nodes
NODE_DISPLAY_NAME_MAPPINGS  = {
    # Primitive nodes
    "Sage_SetBool": "Set Bool",
    "Sage_SetInteger": "Set Integer",
    "Sage_SetFloat": "Set Float",

    #Logic nodes
    "Sage_LogicalSwitch": "Switch",
    "Sage_TextCompare": "Text Compare",

    # Text nodes
    "Sage_SetText": "Set Text",
    "Sage_JoinText": "Join Text",
    "Sage_TripleJoinText": "Join Text x3",
    "Sage_CleanText": "Clean Text",
    "Sage_ViewText": "View Text",
    "Sage_ViewAnything": "View Any Node as Text",
    "Sage_PonyPrefix": "Add Pony v6 Prefixes",

    # Model nodes
    "Sage_UNETLoader": "Load Diffusion Model w/ Metadata",
    "Sage_CheckpointLoaderSimple": "Load Checkpoint w/ Metadata",
    "Sage_CheckpointLoaderRecent": "Load Recently Used Checkpoint",
    "Sage_ModelInfo": "Model Info",
    "Sage_CacheMaintenance": "Cache Maintenance",
    "Sage_ModelReport": "Model Scan & Report",
    "Sage_ModelLoraStackLoader": "Model + Lora Stack Loader",

    # Lora stack nodes
    "Sage_LoraStack": "Simple Lora Stack",
    "Sage_LoraStackRecent": "Recent Lora Stack",
    "Sage_TripleLoraStack": "Triple Lora Stack",
    "Sage_LoraStackLoader": "Lora Stack Loader",
    "Sage_CollectKeywordsFromLoraStack": "Lora Stack -> Keywords",
    "Sage_LastLoraInfo": "Last Lora Info",

    # Clip nodes
    "Sage_DualCLIPTextEncode": "Prompts to CLIP",
    "Sage_DualCLIPTextEncodeLumina2": "Prompts to CLIP for Lumina 2",
    "Sage_ConditioningZeroOut": "Zero Conditioning",
    #"Sage_ConditioningOneOut": "One Conditioning",
    "Sage_ConditioningRngOut": "Randomized conditioning",

    # Sampler nodes
    "Sage_KSampler": "KSampler w/ Sampler Info",
    "Sage_KSamplerDecoder": "KSampler + Decoder",
    "Sage_KSamplerTiledDecoder": "KSampler + Tiled Decoder",

    # Image nodes
    "Sage_EmptyLatentImagePassthrough": "Empty Latent Passthrough",
    "Sage_LoadImage": "Load Image w/ Size & Metadata",
    "Sage_SaveImageWithMetadata": "Save Image w/ Added Metadata",

    # Metadata nodes
    "Sage_SamplerInfo": "Sampler Info",
    "Sage_AdvSamplerInfo": "Adv Sampler Info",
    "Sage_TilingInfo": "Tiling Info",
    "Sage_ConstructMetadata": "Construct Metadata",
    "Sage_ConstructMetadataLite": "Construct Metadata Lite",

    # Utility nodes
    "Sage_GetFileHash": "Get Sha256 Hash",
    "Sage_CheckpointInfoOnly": "Checkpoint Info", #
    
    # Test nodes
    "Sage_Foobar": "Test Node (Do not use)"#,
    #"Sage_StringListTest": "String List Test"
}

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS', 'WEB_DIRECTORY']
