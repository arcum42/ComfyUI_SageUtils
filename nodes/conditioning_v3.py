# Conditioning nodes v3
# This will include any nodes involving clip or conditioning.
# See ref_docs/v3_migration.md for info on migrating to v3 nodes.

from __future__ import annotations

import torch

from comfy_api.latest import io
from comfy_api.latest._io import NodeOutput, Schema
from comfy_execution.graph_utils import GraphBuilder
from comfy.utils import ProgressBar

# Import specific utilities from source modules
from ..utils.prompt_utils import condition_text, clean_if_needed
from ..utils.constants import LUMINA2_SYSTEM_PROMPT, LUMINA2_SYSTEM_PROMPT_TIP, PROMPT_START


def _apply_conditioning_operation(conditioning, operation: dict):
    op_mode = operation.get("operation", "none")
    value = float(operation.get("value", 1.0))

    if op_mode == "none":
        return conditioning
    if op_mode == "divide":
        if abs(value) < 1e-12:
            raise ValueError("Operation value cannot be zero when using divide.")
        multiplier = 1.0 / value
    else:
        multiplier = value

    if abs(multiplier - 1.0) < 1e-9:
        return conditioning

    scaled = []
    for token, meta in conditioning:
        new_meta = meta.copy()
        current_strength = float(new_meta.get("strength", 1.0))
        new_meta["strength"] = current_strength * multiplier
        scaled.append([token, new_meta])
    return scaled


class Sage_CombineConditioning(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        autogrow_template = io.Autogrow.TemplatePrefix(
            input=io.Conditioning.Input("conditioning"),
            prefix="conditioning_",
            min=2,
            max=100,
        )
        return io.Schema(
            node_id="Sage_CombineConditioning",
            display_name="Combine Conditioning",
            description="Combines multiple conditionings into a single conditioning.",
            category="Sage Utils/clip-cond",
            inputs=[
                io.DynamicCombo.Input("operation", display_name="operation", options=[
                    io.DynamicCombo.Option("none", []),
                    io.DynamicCombo.Option("multiply", [
                        io.Float.Input(id="value", display_name="value", default=1.0, min=0.0, max=100.0, step=0.01, tooltip="Multiply by this value.")
                    ]),
                    io.DynamicCombo.Option("divide", [
                        io.Float.Input(id="value", display_name="value", default=1.0, min=0.000001, max=100.0, step=0.01, tooltip="Divide by this value.")
                    ]),
                ]),
                io.Autogrow.Input("conditionings", template=autogrow_template),
            ],
            outputs=[
                io.Conditioning.Output(id="conditioning", display_name="conditioning"),
            ],
        )

    @classmethod
    def execute(cls, **kwargs) -> NodeOutput:
        operation = kwargs.get("operation", {})
        conditionings = kwargs.get("conditionings", {})
        ordered_conditionings = []

        for key, value in conditionings.items():
            if not key.startswith("conditioning_"):
                continue
            try:
                index = int(key.rsplit("_", 1)[1])
            except (ValueError, IndexError):
                continue
            ordered_conditionings.append((index, value))

        ordered_conditionings.sort(key=lambda item: item[0])
        values = [value for _, value in ordered_conditionings if value is not None]

        if not values:
            raise ValueError("At least one conditioning input is required.")

        combined = values[0]
        for conditioning in values[1:]:
            combined += conditioning

        return io.NodeOutput(_apply_conditioning_operation(combined, operation))


class Sage_AverageConditioning(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        autogrow_template = io.Autogrow.TemplatePrefix(
            input=io.Conditioning.Input("conditioning"),
            prefix="conditioning_",
            min=2,
            max=100,
        )
        return io.Schema(
            node_id="Sage_AverageConditioning",
            display_name="Average Conditioning",
            description="Averages multiple conditioning inputs into one conditioning.",
            category="Sage Utils/clip-cond",
            enable_expand=True,
            inputs=[
                io.Autogrow.Input("conditionings", template=autogrow_template),
            ],
            outputs=[
                io.Conditioning.Output(id="conditioning", display_name="conditioning"),
            ],
        )

    @classmethod
    def execute(cls, **kwargs) -> NodeOutput:
        conditionings = kwargs.get("conditionings", {})
        ordered_conditionings = []

        for key, value in conditionings.items():
            if not key.startswith("conditioning_"):
                continue
            try:
                index = int(key.rsplit("_", 1)[1])
            except (ValueError, IndexError):
                continue
            if value is not None:
                ordered_conditionings.append((index, value))

        ordered_conditionings.sort(key=lambda item: item[0])
        values = [value for _, value in ordered_conditionings]

        if len(values) < 2:
            raise ValueError("At least two conditioning inputs are required.")

        graph = GraphBuilder()
        average = values[0]

        for idx, conditioning in enumerate(values[1:], start=2):
            strength = (idx - 1) / idx
            average_node = graph.node(
                "ConditioningAverage",
                conditioning_to=average,
                conditioning_from=conditioning,
                conditioning_to_strength=strength,
            )
            average = average_node.out(0)

        return io.NodeOutput(
            average,
            expand=graph.finalize(),
        )


class Sage_ZeroConditioning(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_ZeroConditioning",
            display_name="Zero Conditioning",
            description="Returns zeroed out conditioning.",
            category="Sage Utils/clip-cond",
            inputs=[
                io.Clip.Input(id="clip", display_name="clip", tooltip="The CLIP model used for encoding.")
            ],
            outputs=[
                io.Conditioning.Output(id="conditioning", display_name="conditioning", tooltip="A conditioning containing all zeros.")
            ]
        )

    @classmethod
    def execute(cls, **kwargs) -> NodeOutput:
        clip = kwargs.get("clip")
        if clip is None:
            raise ValueError("Clip input is required.")
        return io.NodeOutput(condition_text(clip))

class Sage_SingleCLIPTextEncode(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_SingleCLIPTextEncode",
            display_name="Single CLIP Text Encode",
            description="Turns text into conditioning, and passes through the prompt. Zeros any input not hooked up.",
            category="Sage Utils/clip-cond",
            inputs=[
                io.Clip.Input(id="clip", display_name="clip", tooltip="The CLIP model used for encoding the text."),
                io.String.Input(id="text", display_name="text", force_input=True, multiline=True, dynamic_prompts=True, tooltip="The positive prompt's text.")
            ],
            outputs=[
                io.Conditioning.Output(id="conditioning", display_name="conditioning", tooltip="A conditioning containing the embedded text used to guide the diffusion model."),
                io.String.Output(id="text_output", display_name="text", tooltip="The positive prompt's text.")
            ]
        )

    @classmethod
    def execute(cls, **kwargs) -> NodeOutput:
        clip = kwargs.get("clip")
        text = kwargs.get("text")
        if clip is None:
            raise ValueError("Clip input is required.")
        if isinstance(clip, tuple):
            clip = clip[0]
        conditioning = condition_text(clip, text)
        return io.NodeOutput(conditioning, text or "")


class Sage_CombineCLIPTextEncode(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        autogrow_template = io.Autogrow.TemplatePrefix(
            input=io.String.Input("text", force_input=True, multiline=True, dynamic_prompts=True),
            prefix="text_",
            min=1,
            max=100,
        )
        return io.Schema(
            node_id="Sage_CombineCLIPTextEncode",
            display_name="Combine CLIP Text Encode",
            description="Encodes multiple text inputs with CLIP and combines them into one conditioning.",
            category="Sage Utils/clip-cond",
            inputs=[
                io.Clip.Input(id="clip", display_name="clip", tooltip="The CLIP model used for encoding the text."),
                io.DynamicCombo.Input("operation", display_name="operation", options=[
                    io.DynamicCombo.Option("none", []),
                    io.DynamicCombo.Option("multiply", [
                        io.Float.Input(id="value", display_name="value", default=1.0, min=0.0, max=100.0, step=0.01, tooltip="Multiply by this value.")
                    ]),
                    io.DynamicCombo.Option("divide", [
                        io.Float.Input(id="value", display_name="value", default=1.0, min=0.000001, max=100.0, step=0.01, tooltip="Divide by this value.")
                    ]),
                ]),
                io.Autogrow.Input("texts", template=autogrow_template),
            ],
            outputs=[
                io.Conditioning.Output(id="conditioning", display_name="conditioning", tooltip="A conditioning containing all encoded text prompts combined."),
            ],
        )

    @classmethod
    def execute(cls, **kwargs) -> NodeOutput:
        clip = kwargs.get("clip")
        operation = kwargs.get("operation", {})
        texts = kwargs.get("texts", {})

        if clip is None:
            raise ValueError("Clip input is required.")
        if isinstance(clip, tuple):
            clip = clip[0]

        ordered_texts = []
        for key, value in texts.items():
            if not key.startswith("text_"):
                continue
            try:
                index = int(key.rsplit("_", 1)[1])
            except (ValueError, IndexError):
                continue
            ordered_texts.append((index, value))

        ordered_texts.sort(key=lambda item: item[0])
        text_values = [value for _, value in ordered_texts]

        if not text_values:
            raise ValueError("At least one text input is required.")

        combined = condition_text(clip, text_values[0])
        for text in text_values[1:]:
            combined += condition_text(clip, text)

        return io.NodeOutput(_apply_conditioning_operation(combined, operation))


class Sage_CombineCLIPMultilineTextEncode(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_CombineCLIPMultilineTextEncode",
            display_name="Combine CLIP Multiline Text Encode",
            description="Encodes each non-empty line of multiline text with CLIP and combines them into one conditioning.",
            category="Sage Utils/clip-cond",
            inputs=[
                io.Clip.Input(id="clip", display_name="clip", tooltip="The CLIP model used for encoding the text."),
                io.Combo.Input(id="mode", display_name="mode", options=["combine", "average"], default="combine", tooltip="How to merge line conditionings."),
                io.DynamicCombo.Input("operation", display_name="operation", options=[
                    io.DynamicCombo.Option("none", []),
                    io.DynamicCombo.Option("multiply", [
                        io.Float.Input(id="value", display_name="value", default=1.0, min=0.0, max=100.0, step=0.01, tooltip="Multiply by this value.")
                    ]),
                    io.DynamicCombo.Option("divide", [
                        io.Float.Input(id="value", display_name="value", default=1.0, min=0.000001, max=100.0, step=0.01, tooltip="Divide by this value.")
                    ]),
                ]),
                io.String.Input(id="text", display_name="text", force_input=True, multiline=True, dynamic_prompts=True, tooltip="Multiline text where each line is encoded separately."),
            ],
            outputs=[
                io.Conditioning.Output(id="conditioning", display_name="conditioning", tooltip="A conditioning containing all encoded lines combined."),
            ],
        )

    @classmethod
    def execute(cls, **kwargs) -> NodeOutput:
        clip = kwargs.get("clip")
        mode = kwargs.get("mode", "combine")
        operation = kwargs.get("operation", {})
        text = kwargs.get("text", "")

        if clip is None:
            raise ValueError("Clip input is required.")
        if isinstance(clip, tuple):
            clip = clip[0]

        lines = [line.strip() for line in text.split("\n") if line.strip()]
        if not lines:
            raise ValueError("At least one non-empty line is required.")

        encoded = [condition_text(clip, line) for line in lines]
        processed = [_apply_conditioning_operation(conditioning, operation) for conditioning in encoded]

        if mode == "average":
            if len(processed) == 1:
                combined = processed[0]
            else:
                combined = processed[0]
                for idx, conditioning in enumerate(processed[1:], start=2):
                    strength = (idx - 1) / idx
                    if len(conditioning) > 1:
                        conditioning = [conditioning[0]]

                    cond_from = conditioning[0][0]
                    pooled_output_from = conditioning[0][1].get("pooled_output", None)
                    out = []

                    for i in range(len(combined)):
                        t1 = combined[i][0]
                        pooled_output_to = combined[i][1].get("pooled_output", pooled_output_from)
                        t0 = cond_from[:, :t1.shape[1]]
                        if t0.shape[1] < t1.shape[1]:
                            pad = torch.zeros((1, t1.shape[1] - t0.shape[1], t1.shape[2]), device=t1.device, dtype=t1.dtype)
                            t0 = torch.cat([t0, pad], dim=1)

                        tw = (t1 * strength) + (t0 * (1.0 - strength))
                        t_to = combined[i][1].copy()
                        if pooled_output_from is not None and pooled_output_to is not None:
                            t_to["pooled_output"] = (pooled_output_to * strength) + (pooled_output_from * (1.0 - strength))
                        elif pooled_output_from is not None:
                            t_to["pooled_output"] = pooled_output_from

                        out.append([tw, t_to])

                    combined = out
        else:
            combined = processed[0]
            for conditioning in processed[1:]:
                combined += conditioning

        return io.NodeOutput(combined)


class Sage_MultiplyConditioningStrength(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_MultiplyConditioningStrength",
            display_name="Multiply Conditioning Strength",
            description="Multiplies conditioning strength by a float value.",
            category="Sage Utils/clip-cond",
            inputs=[
                io.Conditioning.Input(id="conditioning", display_name="conditioning", tooltip="The conditioning to scale."),
                io.DynamicCombo.Input("operation", display_name="operation", options=[
                    io.DynamicCombo.Option("multiply", [
                        io.Float.Input(id="value", display_name="value", default=1.0, min=0.0, max=100.0, step=0.01, tooltip="Multiply by this value.")
                    ]),
                    io.DynamicCombo.Option("divide", [
                        io.Float.Input(id="value", display_name="value", default=1.0, min=0.000001, max=100.0, step=0.01, tooltip="Divide by this value.")
                    ]),
                    io.DynamicCombo.Option("none", []),
                ]),
            ],
            outputs=[
                io.Conditioning.Output(id="conditioning", display_name="conditioning", tooltip="The scaled conditioning."),
            ],
        )

    @classmethod
    def execute(cls, **kwargs) -> NodeOutput:
        conditioning = kwargs.get("conditioning")
        operation = kwargs.get("operation", {"operation": "multiply", "value": 1.0})

        if conditioning is None:
            raise ValueError("Conditioning input is required.")

        return io.NodeOutput(_apply_conditioning_operation(conditioning, operation))


class Sage_NormalizeConditioningStrength(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_NormalizeConditioningStrength",
            display_name="Normalize Conditioning Strength",
            description="Normalizes conditioning strengths to a target magnitude.",
            category="Sage Utils/clip-cond",
            inputs=[
                io.Conditioning.Input(id="conditioning", display_name="conditioning", tooltip="The conditioning to normalize."),
                io.Combo.Input(id="norm", display_name="norm", options=["l1", "max_abs"], default="l1", tooltip="Normalization strategy."),
                io.Float.Input(id="target", display_name="target", default=1.0, min=0.0, max=100.0, step=0.01, tooltip="Target normalized magnitude."),
            ],
            outputs=[
                io.Conditioning.Output(id="conditioning", display_name="conditioning", tooltip="Normalized conditioning."),
            ],
        )

    @classmethod
    def execute(cls, **kwargs) -> NodeOutput:
        conditioning = kwargs.get("conditioning")
        norm = kwargs.get("norm", "l1")
        target = float(kwargs.get("target", 1.0))

        if conditioning is None:
            raise ValueError("Conditioning input is required.")
        if len(conditioning) == 0:
            return io.NodeOutput(conditioning)

        strengths = [float(meta.get("strength", 1.0)) for _, meta in conditioning]

        if norm == "max_abs":
            denom = max(abs(s) for s in strengths)
        else:
            denom = sum(abs(s) for s in strengths)

        if denom < 1e-12:
            raise ValueError("Cannot normalize conditioning with zero total strength.")

        scale = target / denom
        normalized = []
        for token, meta in conditioning:
            new_meta = meta.copy()
            new_meta["strength"] = float(new_meta.get("strength", 1.0)) * scale
            normalized.append([token, new_meta])

        return io.NodeOutput(normalized)

class Sage_DualCLIPTextEncode(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_DualCLIPTextEncode",
            display_name="Dual CLIP Text Encode",
            description="Turns a positive and negative prompt into conditionings, and passes through the prompts. Saves space over two CLIP Text Encoders, and zeros any input not hooked up.",
            category="Sage Utils/clip-cond",
            inputs=[
                io.Clip.Input(id="clip", display_name="clip", tooltip="The CLIP model used for encoding the text."),
                io.Boolean.Input(id="clean", display_name="clean", default=True, tooltip="Clean up the text, getting rid of extra spaces, commas, etc."),
                io.String.Input(id="pos", display_name="pos", optional=True, force_input=True, multiline=True, dynamic_prompts=True, tooltip="The positive prompt's text."),
                io.String.Input(id="neg", display_name="neg", optional=True, force_input=True, multiline=True, dynamic_prompts=True, tooltip="The negative prompt's text.")
            ],
            outputs=[
                io.Conditioning.Output(id="positive", display_name="positive", tooltip="A conditioning containing the embedded text used to guide the diffusion model."),
                io.Conditioning.Output(id="negative", display_name="negative", tooltip="A conditioning containing the embedded text used to guide the diffusion model."),
                io.String.Output(id="pos_text", display_name="pos_text", tooltip="The positive prompt's text."),
                io.String.Output(id="neg_text", display_name="neg_text", tooltip="The negative prompt's text.")
            ]
        )

    @classmethod
    def execute(cls, **kwargs) -> NodeOutput:
        clip = kwargs.get("clip")
        clean = kwargs.get("clean", True)
        pos = kwargs.get("pos", "")
        neg = kwargs.get("neg", "")
        pbar = ProgressBar(2)

        if clip is None:
            raise ValueError("Clip input is required.")
        if isinstance(clip, tuple):
            clip = clip[0]
        pos = clean_if_needed(pos, clean)
        neg = clean_if_needed(neg, clean)
        if isinstance(clip, tuple):
            clip = clip[0]
    
        pbar.update(1)
        pos_cond = condition_text(clip, pos)

        pbar.update(1)
        neg_cond = condition_text(clip, neg)

        return io.NodeOutput(pos_cond, neg_cond, pos or "", neg or "")

class Sage_DualCLIPTextEncodeLumina2(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_DualCLIPTextEncodeLumina2",
            display_name="Dual CLIP Text Encode Lumina 2",
            description="Turns a positive and negative prompt into conditionings, and passes through the prompts. Saves space over two CLIP Text Encoders, and zeros any input not hooked up.",
            category="Sage Utils/clip-cond",
            inputs=[
                io.Clip.Input(id="clip", display_name="clip", tooltip="The CLIP model used for encoding the text."),
                io.Combo.Input(id="system_prompt", display_name="system_prompt", options=list(LUMINA2_SYSTEM_PROMPT.keys()), default="superior", tooltip=LUMINA2_SYSTEM_PROMPT_TIP),
                io.Boolean.Input(id="clean", display_name="clean", default=True, tooltip="Clean up the text, getting rid of extra spaces, commas, etc."),
                io.String.Input(id="pos", display_name="pos", optional=True, force_input=True, multiline=True, dynamic_prompts=True, tooltip="The positive prompt's text."),
                io.String.Input(id="neg", display_name="neg", optional=True, force_input=True, multiline=True, dynamic_prompts=True, tooltip="The negative prompt's text."),
            ],
            outputs=[
                io.Conditioning.Output(id="positive", display_name="positive", tooltip="A conditioning containing the embedded text used to guide the diffusion model."),
                io.Conditioning.Output(id="negative", display_name="negative", tooltip="A conditioning containing the embedded text used to guide the diffusion model."),
                io.String.Output(id="pos_text", display_name="pos_text", tooltip="The positive prompt's text."),
                io.String.Output(id="neg_text", display_name="neg_text", tooltip="The negative prompt's text.")
            ]
        )

    @classmethod
    def execute(cls, **kwargs) -> NodeOutput:
        clip = kwargs.get("clip")
        system_prompt = kwargs.get("system_prompt", "superior")
        clean = kwargs.get("clean", True)
        pos = kwargs.get("pos", "")
        neg = kwargs.get("neg", "")

        pbar = ProgressBar(2)
        sys_prompt = LUMINA2_SYSTEM_PROMPT[system_prompt]
        pos = f'{sys_prompt}{PROMPT_START}{pos}' if pos is not None else None
        neg = f'{sys_prompt}{PROMPT_START}{neg}' if neg is not None else None
        pos = clean_if_needed(pos, clean)
        neg = clean_if_needed(neg, clean)
        if isinstance(clip, tuple):
            clip = clip[0]
    
        pbar.update(1)
        pos_cond = condition_text(clip, pos)

        pbar.update(1)
        neg_cond = condition_text(clip, neg)
        return io.NodeOutput(pos_cond, neg_cond, pos or "", neg or "")

class Sage_SingleCLIPTextImageEncode(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_SingleCLIPTextImageEncode",
            display_name="Single CLIP Text Image Encode",
            description="Turns a prompt into conditioning, and passes through the prompt. Zeros any input not hooked up.",
            category="Sage Utils/clip-cond",
            enable_expand=True,
            inputs=[
                io.Clip.Input(id="clip", display_name="clip", tooltip="The CLIP model used for encoding the text."),
                io.Boolean.Input(id="clean", display_name="clean", default=True, tooltip="Clean up the text, getting rid of extra spaces, commas, etc."),
                io.Vae.Input(id="vae", display_name="vae", optional=True, tooltip="The VAE model used for encoding the reference image."),
                io.String.Input(id="text", display_name="text", optional=True, force_input=True, multiline=True, dynamic_prompts=True, tooltip="The prompt's text."),
                io.Image.Input(id="image", display_name="image", optional=True, tooltip="The prompt's image.")
            ],
            outputs=[
                io.Conditioning.Output(id="conditioning", display_name="conditioning", tooltip="A conditioning containing the embedded text used to guide the diffusion model."),
                io.String.Output(id="text", display_name="text", tooltip="The positive prompt's text.")
            ]
        )

    @classmethod
    def execute(cls, **kwargs) -> NodeOutput:
        clip = kwargs.get("clip")
        clean = kwargs.get("clean", True)
        vae = kwargs.get("vae", None)
        text = kwargs.get("text", "")
        image = kwargs.get("image", None)

        if isinstance(clip, tuple):
            clip = clip[0]

        text = clean_if_needed(text, clean)

        graph = GraphBuilder()

        clip_node = graph.node("TextEncodeQwenImageEdit", clip=clip, prompt=text, vae=vae, image=image)
        cond = clip_node.out(0)
        if text is None and image is None:
            text = ""
            pos_zero_node = graph.node("ConditioningZeroOut", conditioning=clip_node.out(0))
            cond = pos_zero_node.out(0)

        return io.NodeOutput(
            cond, text or "",
            expand=graph.finalize()
        )

class Sage_DualCLIPTextEncodeQwen(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_DualCLIPTextEncodeQwen",
            display_name="Dual CLIP Text Encode Qwen",
            description="Turns a positive and negative prompt into conditionings, and passes through the prompts. Saves space over two Qwen Image Edit Text Encoders, and zeros any input not hooked up.",
            category="Sage Utils/clip-cond",
            enable_expand=True,
            inputs=[
                io.Clip.Input(id="clip", display_name="clip", tooltip="The CLIP model used for encoding the text."),
                io.Boolean.Input(id="clean", display_name="clean", default=True, tooltip="Clean up the text, getting rid of extra spaces, commas, etc."),
                io.Vae.Input(id="vae", display_name="vae", optional=True, tooltip="The VAE model used for encoding the reference image."),
                io.String.Input(id="pos", display_name="pos", optional=True, force_input=True, multiline=True, dynamic_prompts=True, tooltip="The positive prompt's text."),
                io.String.Input(id="neg", display_name="neg", optional=True, force_input=True, multiline=True, dynamic_prompts=True, tooltip="The negative prompt's text."),
                io.Image.Input(id="pos_image", display_name="pos_image", optional=True, tooltip="The positive prompt's image."),
                io.Image.Input(id="neg_image", display_name="neg_image", optional=True, tooltip="The negative prompt's image.")
            ],
            outputs=[
                io.Conditioning.Output(id="positive", display_name="positive", tooltip="A conditioning containing the embedded text used to guide the diffusion model."),
                io.Conditioning.Output(id="negative", display_name="negative", tooltip="A conditioning containing the embedded text used to guide the diffusion model."),
                io.String.Output(id="pos_text", display_name="pos_text", tooltip="The positive prompt's text."),
                io.String.Output(id="neg_text", display_name="neg_text", tooltip="The negative prompt's text.")
            ]
        )

    @classmethod
    def execute(cls, **kwargs) -> NodeOutput:
        clip = kwargs.get("clip")
        clean = kwargs.get("clean", True)
        vae = kwargs.get("vae", None)
        pos = kwargs.get("pos", "")
        pos_image = kwargs.get("pos_image", None)
        neg = kwargs.get("neg", "")
        neg_image = kwargs.get("neg_image", None)

        if isinstance(clip, tuple):
            clip = clip[0]

        pos = clean_if_needed(pos, clean)
        neg = clean_if_needed(neg, clean)

        graph = GraphBuilder()

        pos_node = graph.node("TextEncodeQwenImageEdit", clip=clip, prompt=pos, vae=vae, image=pos_image)
        pos_cond = pos_node.out(0)
        if pos is None and pos_image is None:
            pos = ""
            pos_zero_node = graph.node("ConditioningZeroOut", conditioning=pos_node.out(0))
            pos_cond = pos_zero_node.out(0)
        neg_node = graph.node("TextEncodeQwenImageEdit", clip=clip, prompt=neg, vae=vae, image=neg_image)
        neg_cond = neg_node.out(0)
        if neg is None and neg_image is None:
            neg = ""
            neg_zero_node = graph.node("ConditioningZeroOut", conditioning=neg_node.out(0))
            neg_cond = neg_zero_node.out(0)

        return io.NodeOutput(
            pos_cond, neg_cond, pos or "", neg or "",
            expand=graph.finalize()
        )

CONDITIONING_NODES = [
    # clip conditioning nodes
    Sage_CombineConditioning,
    Sage_AverageConditioning,
    Sage_MultiplyConditioningStrength,
    Sage_NormalizeConditioningStrength,
    Sage_ZeroConditioning,
    Sage_SingleCLIPTextEncode,
    Sage_CombineCLIPTextEncode,
    Sage_CombineCLIPMultilineTextEncode,
    Sage_DualCLIPTextEncode,
    Sage_DualCLIPTextEncodeLumina2,
    Sage_DualCLIPTextEncodeQwen,
    Sage_SingleCLIPTextImageEncode
]
