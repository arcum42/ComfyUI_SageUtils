# Model nodes.
# This contains nodes involving models. Primarily loading models, but also includes nodes for model info and cache maintenance.

from __future__ import annotations
from comfy.comfy_types.node_typing import ComfyNodeABC, InputTypeDict, IO
from ..utils.helpers import pull_metadata, update_model_timestamp, pull_and_update_model_timestamp

# Import specific utilities instead of wildcard import
from ..utils import get_lora_stack_keywords
from ..utils import model_info as mi
from ..utils.helpers_graph import (
    add_ckpt_node,
    add_unet_node,
    add_clip_node,
    add_vae_node,
    create_model_shift_nodes,
    create_lora_nodes,
    create_lora_shift_nodes,
    create_model_loader_nodes
)

from comfy_execution.graph_utils import GraphBuilder
import folder_paths
import logging

class Sage_UNETLoaderFromInfo(ComfyNodeABC):
    """Load UNET model component from model info."""
    
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "unet_info": ("UNET_INFO", {
                    "tooltip": "The diffusion model you want to load."
                              "Note: Should be from the unet selector node, not a loader node, "
                              "or the model will be loaded twice."
                }),
            }
        }

    RETURN_TYPES = (IO.MODEL,)
    RETURN_NAMES = ("model",)
    FUNCTION = "load_unet"
    CATEGORY = "Sage Utils/model"
    DESCRIPTION = "Load the UNET model component from unet_info."

    def load_unet(self, unet_info):
        """Load UNET from model info."""
        #logging.info("Loading UNET...")
        graph = GraphBuilder()
        unet_node = add_unet_node(graph, unet_info)
        if unet_node is None:
            raise ValueError("UNET info is missing or invalid.")
        else:
            pull_and_update_model_timestamp(unet_info["path"], model_type="unet")

        # Return the UNET node as a model component.
        logging.info(f"UNET loaded: {unet_info['path']}")
        unet_out = unet_node.out(0) if unet_node else None
        # Return the UNET node and the serialized graph.
        return {
            "result": (unet_out,),
            "expand": graph.finalize()
        }

class Sage_CLIPLoaderFromInfo(ComfyNodeABC):
    """Load CLIP model component from model info."""
    
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "clip_info": ("CLIP_INFO", {
                    "tooltip": "The text encoder model you want to load. "
                              "Note: Should be from the clip selector node, not a loader node, "
                              "or the model will be loaded twice."
                }),
            }
        }

    RETURN_TYPES = (IO.CLIP,)
    RETURN_NAMES = ("clip",)
    FUNCTION = "load_clip"
    CATEGORY = "Sage Utils/model"
    DESCRIPTION = "Load the CLIP model component from clip_info."

    def load_clip(self, clip_info):
        """Load CLIP from model info."""
        #logging.info("Loading CLIP...")
        graph = GraphBuilder()
        clip_node = add_clip_node(graph, clip_info)
        if clip_node is None:
            raise ValueError("CLIP info is missing or invalid.")
        else:
            pull_and_update_model_timestamp(clip_info["path"], model_type="clip")

        # Return the CLIP node as a model component.
        logging.info(f"CLIP loaded: {clip_info['path']}")
        clip_out = clip_node.out(0) if clip_node else None
        # Return the CLIP node and the serialized graph.
        return {
            "result": (clip_node.out(0),),
            "expand": graph.finalize()
        }

class Sage_ChromaCLIPLoaderFromInfo(ComfyNodeABC):
    """Load Chroma CLIP model component from model info."""
    
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "clip_info": ("CLIP_INFO", {
                    "tooltip": "The CLIP model you want to load. "
                              "Note: Should be from the clip selector node, not a loader node, "
                              "or the model will be loaded twice."
                }),
            }
        }

    RETURN_TYPES = (IO.CLIP,)
    RETURN_NAMES = ("clip",)
    FUNCTION = "load_clip"
    CATEGORY = "Sage Utils/model"
    DESCRIPTION = "Load the CLIP model component from clip_info, and apply T5 tokenizer options with min padding of 1, and min length of 0."

    def load_clip(self, clip_info):
        """Load Chroma CLIP from model info."""
        #logging.info("Loading CLIP...")
        graph = GraphBuilder()
        clip_node = add_clip_node(graph, clip_info)
        if clip_node is None:
            raise ValueError("CLIP info is missing or invalid.")
        else:
            pull_and_update_model_timestamp(clip_info["path"], model_type="clip")

        clip_node = graph.node("T5TokenizerOptions", clip=clip_node.out(0), min_padding=1, min_length=0)
        # Return the CLIP node as a model component.
        logging.info(f"CLIP loaded: {clip_info['path']}")
        return {
            "result": (clip_node.out(0),),
            "expand": graph.finalize()
        }

class Sage_VAELoaderFromInfo(ComfyNodeABC):
    """Load VAE model component from model info."""
    
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "vae_info": ("VAE_INFO", {
                    "tooltip": "The VAE model you want to load. "
                              "Note: Should be from the checkpoint info node, not a loader node, "
                              "or the model will be loaded twice."
                }),
            }
        }

    RETURN_TYPES = (IO.VAE,)
    RETURN_NAMES = ("vae",)
    FUNCTION = "load_vae"
    CATEGORY = "Sage Utils/model"
    DESCRIPTION = "Load the VAE model component from vae_info."

    def load_vae(self, vae_info):
        """Load VAE from model info."""
        #logging.info("Loading VAE...")
        graph = GraphBuilder()
        vae_node = add_vae_node(graph, vae_info)
        if vae_node is None:
            raise ValueError("VAE info is missing or invalid.")
        else:
            pull_and_update_model_timestamp(vae_info["path"], model_type="vae")

        # Return the VAE node as a model component.
        logging.info(f"VAE loaded: {vae_info['path']}")
        vae_out = vae_node.out(0) if vae_node else None
        # Return the VAE node and the serialized graph.
        return {
            "result": (vae_out,),
            "expand": graph.finalize()
        }
class Sage_LoraStackLoader(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "model": (IO.MODEL, {"tooltip": "The diffusion model the LoRA will be applied to."}),
                "clip": (IO.CLIP, {"tooltip": "The CLIP model the LoRA will be applied to."})
            },
            "optional": {
                "lora_stack": ("LORA_STACK", {"forceInput": True}),
                "model_shifts": ("MODEL_SHIFTS", {"forceInput": True, "tooltip": "The model shifts & free_u2 settings to apply to the model."})
            }
        }

    RETURN_TYPES = (IO.MODEL, IO.CLIP, "LORA_STACK", IO.STRING)
    RETURN_NAMES = ("model", "clip", "lora_stack", "keywords")
    OUTPUT_TOOLTIPS = ("The modified diffusion model.", "The modified CLIP model.", "The stack of loras.", "Keywords from the lora stack.")
    FUNCTION = "load_lora"
    CATEGORY = "Sage Utils/lora"
    DESCRIPTION = "Accept a lora_stack with Model and Clip, and apply all the loras in the stack at once."

    def load_lora(self, model, clip, lora_stack=None, model_shifts=None) -> dict:
        graph = GraphBuilder()
        exit_node, exit_unet, exit_clip = create_lora_shift_nodes(graph, model, clip, lora_stack, model_shifts)
        keywords = get_lora_stack_keywords(lora_stack) if lora_stack is not None else ""

        return {
            "result": (exit_unet, exit_clip, lora_stack, keywords),
            "expand": graph.finalize()
        }

class Sage_LoadModelFromInfo(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "model_info": ("MODEL_INFO", {
                    "tooltip": "The model to load. Note: Should be from a info node, not a loader node, or the model will be loaded twice."
                }),
            },
            "optional": {
                "model_shifts": ("MODEL_SHIFTS", { "tooltip": "The model shifts & free_u2 settings to apply to the model." })
            }
        }

    RETURN_TYPES = (IO.MODEL, IO.CLIP, IO.VAE)
    RETURN_NAMES = ("model", "clip", "vae")
    INPUT_IS_LIST = True

    FUNCTION = "load_model"
    CATEGORY = "Sage Utils/model"
    DESCRIPTION = "Load model components."

    def load_model(self, model_info, model_shifts=None) -> dict:
        graph = GraphBuilder()
        unet_out, clip_out, vae_out = create_model_loader_nodes(graph, model_info)

        if model_shifts is not None:
            unet_out = create_model_shift_nodes(graph, unet_out, model_shifts[0])

        return {
            "result": (unet_out, clip_out, vae_out),
            "expand": graph.finalize()
        }

class Sage_ModelLoraStackLoader(Sage_LoadModelFromInfo):
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "model_info": ("MODEL_INFO", {
                    "tooltip": "The model to load. Note: Should be from a info node, not a loader node, or the model will be loaded twice."
                }),
            },
            "optional": {
                "lora_stack": ("LORA_STACK", {"forceInput": True, "tooltip": "The stack of loras to apply to the model."}),
                "model_shifts": ("MODEL_SHIFTS", { "tooltip": "The model shifts to apply." })
            }
        }

    RETURN_TYPES = (IO.MODEL, IO.CLIP, IO.VAE, "LORA_STACK", IO.STRING)
    RETURN_NAMES = ("model", "clip", "vae", "lora_stack", "keywords")
    INPUT_IS_LIST = True

    FUNCTION = "load_model_and_loras"
    CATEGORY = "Sage Utils/model"
    DESCRIPTION = "Load model components from model info using GraphBuilder."

    def load_model_and_loras(self, model_info, lora_stack=None, model_shifts=None) -> dict:
        keywords = ""
        graph = GraphBuilder()
        exit_unet, exit_clip, exit_vae = create_model_loader_nodes(graph, model_info)
        print(f"Model info input: {model_info}")
        print(f"Lora stack input: {lora_stack}")
        print(f"Model shifts input: {model_shifts}")
        model_shifts = model_shifts[0] if model_shifts is not None else None
        lora_stack = lora_stack[0] if lora_stack is not None else None

        exit_node, exit_unet, exit_clip = create_lora_shift_nodes(graph, exit_unet, exit_clip, lora_stack, model_shifts)

        if lora_stack is not None and exit_unet is not None:
            lora_paths = [folder_paths.get_full_path_or_raise("loras", lora[0]) for lora in lora_stack]
            pull_and_update_model_timestamp(lora_paths, model_type="lora")

        keywords = get_lora_stack_keywords(lora_stack) if lora_stack is not None else ""

        return {
            "result": (exit_unet, exit_clip, exit_vae, lora_stack, keywords),
            "expand": graph.finalize()
        }

class Sage_UNETLoRALoader(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "unet_info": ("UNET_INFO", {
                    "tooltip": "The UNET model you want to load. "
                              "Note: Should be from the unet selector node, not a loader node, "
                              "or the model will be loaded twice."
                }),
                
            },
            "optional": {
                "lora_stack": ("LORA_STACK", {"forceInput": True}),
                "model_shifts": ("MODEL_SHIFTS", {"forceInput": True, "tooltip": "The model shifts & free_u2 settings to apply to the model."})
            }
        }

    RETURN_TYPES = (IO.MODEL, "LORA_STACK", IO.STRING)
    RETURN_NAMES = ("model", "lora_stack", "keywords")
    FUNCTION = "load_unet_lora"
    CATEGORY = "Sage Utils/model"
    DESCRIPTION = "Load UNET and apply LoRA stack. This loads the LoRA as model only, no clip."

    def load_unet_lora(self, unet_info, model_shifts=None, lora_stack=None) -> dict:
        graph = GraphBuilder()
        unet_node = add_unet_node(graph, unet_info)
        unet_out = unet_node.out(0) if unet_node else None
        if unet_node is None:
            raise ValueError("UNET info is missing or invalid.")
        else:
            pull_and_update_model_timestamp(unet_info["path"], model_type="unet")

        exit_node, exit_unet, exit_clip = create_lora_shift_nodes(graph, unet_out, None, lora_stack, model_shifts)

        if lora_stack is not None and unet_out is not None:
            lora_paths = [folder_paths.get_full_path_or_raise("loras", lora[0]) for lora in lora_stack]
            pull_and_update_model_timestamp(lora_paths, model_type="lora")

        keywords = get_lora_stack_keywords(lora_stack) if lora_stack is not None else ""

        return {
            "result": (exit_unet, lora_stack, keywords),
            "expand": graph.finalize()
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
