---
type: Report
title: Node/Docs Coverage Comparison
description: Comparison of Sage Utils nodes in NODE_LIST versus markdown files in js/docs.
tags: [planning, docs, nodes, coverage]
timestamp: 2026-07-01T00:00:00Z
---

# Node/Docs Coverage Comparison

This report compares the current Sage Utils node list in `nodes_v3.py` with the Markdown documentation files under `js/docs/`.

## Summary

- `NODE_LIST` contains 113 nodes.
- `js/docs/` contains 55 Markdown files.
- 76 nodes in `NODE_LIST` are missing documentation files.
- 18 `js/docs/` documentation files do not correspond to any node in `NODE_LIST`.

## Missing documentation files

The following node IDs appear in `NODE_LIST` but do not have matching `js/docs/<NodeName>.md` files:

Sage_Ace15AudioEncode
Sage_AceAdvOptions
Sage_AverageConditioning
Sage_CLIPLoaderFromInfo
Sage_CLIPSelector
Sage_ChromaCLIPLoaderFromInfo
Sage_CombineCLIPMultilineTextEncode
Sage_CombineCLIPTextEncode
Sage_CombineConditioning
Sage_ConstructMetadataFlexible
Sage_CropImage
Sage_DualCLIPSelector
Sage_DualCLIPTextEncodeQwen
Sage_DynamicJoinText
Sage_EmptyAceStep15LatentAudio
Sage_ErniePromptEnhancerPrompt
Sage_FlexibleCLIPSelector
Sage_FreeMemory
Sage_FreeU2
Sage_LLMPromptText
Sage_LLMPromptVision
Sage_LLMPromptVisionRefine
Sage_LoadModelFromInfo
Sage_Load_Dataset_From_Folder
Sage_LoraStackInfoDisplay
Sage_LuminaPromptText
Sage_LuminaSystemPrompt
Sage_ModelInfoDisplay
Sage_ModelShiftOnly
Sage_MultiModelPicker
Sage_MultiSelectorDoubleClip
Sage_MultiSelectorFlexibleClip
Sage_MultiSelectorQuadClip
Sage_MultiSelectorSingleClip
Sage_MultiSelectorTripleClip
Sage_MultiplyConditioningStrength
Sage_NormalizeConditioningStrength
Sage_NumberToStr
Sage_ParseMetadataFlexible
Sage_PercentageToFloat
Sage_PonyRatingv6
Sage_PonyRatingv7
Sage_PonyScore
Sage_PonySource
Sage_PonyStyleCluster
Sage_QuadCLIPSelector
Sage_QuickLoraStack
Sage_QuickNineLoraStack
Sage_QuickSixLoraStack
Sage_ReferenceImage
Sage_SamplerInfoNoCFG
Sage_SamplerSelector
Sage_SchedulerSelector
Sage_SetTextWithDynamicPrompts
Sage_SetTextWithNum
Sage_SetTextWithoutComments
Sage_SingleCLIPTextEncode
Sage_SingleCLIPTextImageEncode
Sage_SixLoraStack
Sage_StackLoraStack
Sage_StylePromptFromConfig
Sage_TextRandomLine
Sage_TextSelectLine
Sage_TextSubstitution
Sage_TextSwitch
Sage_TrainingCaptionsToConditioning
Sage_TripleCLIPSelector
Sage_TripleQuickLoraStack
Sage_UNETLoRALoader
Sage_UNETLoaderFromInfo
Sage_UNETSelector
Sage_UnetClipVaeToModelInfo
Sage_VAELoaderFromInfo
Sage_VAESelector
Sage_ViewNotes
Sage_ZeroConditioning

## Extra documentation files

The following `js/docs` filenames do not match any node class in `NODE_LIST`:

SageSetWildcardText
Sage_CacheMaintenance
Sage_CheckpointLoaderRecent
Sage_CheckpointLoaderSimple
Sage_ConditioningZeroOut
Sage_ConstructMetadata
Sage_ConstructMetadataLite
Sage_GetFileHash
Sage_LMStudioLLMPromptText
Sage_LMStudioLLMPromptVision
Sage_LMStudioLLMPromptVisionRefine
Sage_LastLoraInfo
Sage_LoraStackRecent
Sage_ModelReport
Sage_OllamaLLMPromptText
Sage_OllamaLLMPromptVision
Sage_OllamaLLMPromptVisionRefine
Sage_UNETLoader

## Notes

- This report is based on the current `NODE_LIST` construction in `nodes_v3.py` and the current files under `js/docs/`.
- The node list is interpreted from module-level arrays in the `nodes/` Python modules.
- If the package should include additional docs by convention, those docs should be added under `js/docs/` with a matching node class name.
