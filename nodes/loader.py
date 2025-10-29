# Model nodes.
# This contains nodes involving models. Primarily loading models, but also includes nodes for model info and cache maintenance.

from __future__ import annotations
from comfy.comfy_types.node_typing import ComfyNodeABC, InputTypeDict, IO
from ..utils.helpers import pull_metadata, update_model_timestamp, pull_and_update_model_timestamp

# Import specific utilities instead of wildcard import
from ..utils import get_lora_stack_keywords
from ..utils import model_info as mi
from ..utils.helpers_graph import (
    add_ckpt_node_from_info,
    add_unet_node_from_info,
    add_clip_node_from_info,
    add_vae_node_from_info,
    create_lora_nodes,
    create_lora_nodes_model_only,
    create_lora_nodes_v2,
    create_model_shift_nodes,
    create_model_shift_nodes_v2
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
        unet_node = add_unet_node_from_info(graph, unet_info)
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
        clip_node = add_clip_node_from_info(graph, clip_info)
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
        clip_node = add_clip_node_from_info(graph, clip_info)
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
        vae_node = add_vae_node_from_info(graph, vae_info)
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
        # Use graph expansion to build a graph with lora loaders for each lora in the stack.
        if lora_stack is None and model_shifts is None:
            return {
                "result": (model, clip, None, ""),
            }

        graph = GraphBuilder()
        lora_node = exit_node = None

        if lora_stack is not None:
            lora_paths = [folder_paths.get_full_path_or_raise("loras", lora[0]) for lora in lora_stack]
            pull_and_update_model_timestamp(lora_paths, model_type="lora")
            lora_node = create_lora_nodes(graph, model, clip, lora_stack)
        
        if model_shifts is not None:
            exit_node = create_model_shift_nodes(graph, lora_node, model, model_shifts)

        keywords = get_lora_stack_keywords(lora_stack)

        if exit_node is None:
            if lora_node is None:
                logging.info("No loras in stack, returning original model and clip.")
                model_out = model
            else:
                logging.info("No model shifts applied, returning original model.")
                model_out = lora_node.out(0)
        else:
            logging.info("Model shifts applied, returning modified model.")
            model_out = exit_node.out(0)
        
        if lora_node is None:
            logging.info("No loras in stack, returning original clip.")
            clip_out = clip
        else:
            logging.info("Returning modified clip.")
            clip_out = lora_node.out(1)

        return {
            "result": (model_out, clip_out, lora_stack, keywords),
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
    DESCRIPTION = "Load model components from model info using GraphBuilder."

    def prepare_model_graph(self, model_info):
        graph = GraphBuilder()
        nodes = []
        ckpt_node = unet_node = clip_node = vae_node = None
        clip_out = unet_out = vae_out = None
        ckpt_info = unet_info = clip_info = vae_info = None
        # model_info is either a list of dicts, or a list of tuples with dicts inside. Either way, we need to go over each dict, and check the "type" key.

        if isinstance(model_info, list):
            flattened_info = []
            for item in model_info:
                if isinstance(item, tuple):
                    # Unpack the tuple and add all dictionaries to the flattened list
                    flattened_info.extend(item)
                else:
                    flattened_info.append(item)
            model_info = flattened_info
        else:
            # If model_info is not a list, we need to convert it to a list.
            model_info = [model_info]

        for idx, item in enumerate(model_info):
            # Remove the tuple check since we've already flattened the structure
            key = item["type"]
            if key == "CKPT":
                ckpt_info = item
            elif key == "UNET":
                unet_info = item
            elif key == "CLIP":
                clip_info = item
            elif key == "VAE":
                vae_info = item

        if ckpt_info is not None:
            ckpt_node = add_ckpt_node_from_info(graph, ckpt_info)
            if ckpt_node is None:
                raise ValueError("Checkpoint info is missing or invalid.")
            else:
                pull_and_update_model_timestamp(ckpt_info["path"], model_type="ckpt")

        # If we have a UNET, load it with the UNETLoader node.
        if unet_info is not None:
            unet_node = add_unet_node_from_info(graph, unet_info)
            if unet_node is None:
                raise ValueError("UNET info is missing or invalid.")
            else:
                pull_and_update_model_timestamp(unet_info["path"], model_type="unet")

        # If we have a CLIP, load it with the appropriate CLIPLoader node.
        if clip_info is not None:
            clip_node = add_clip_node_from_info(graph, clip_info)
            if clip_node is None:
                raise ValueError("CLIP info is missing or invalid.")
            else:
                pull_and_update_model_timestamp(clip_info["path"], model_type="clip")

        # If we have a VAE, load it with the VAELoader node.
        if vae_info is not None:
            vae_node = add_vae_node_from_info(graph, vae_info)
            if vae_node is None:
                raise ValueError("VAE info is missing or invalid.")
            else:
                pull_and_update_model_timestamp(vae_info["path"], model_type="vae")

        # We need to determine which outputs to return from the nodes.
        # If there's a checkpoint, set all the outputs to use its outputs initially.
        # Then override with UNET, CLIP, and VAE outputs if they exist.
        if ckpt_node is not None:
            nodes.append(ckpt_node)
            unet_out = ckpt_node.out(0)
            clip_out = ckpt_node.out(1)
            vae_out = ckpt_node.out(2)

        if unet_node is not None:
            nodes.append(unet_node)
            unet_out = unet_node.out(0)

        if clip_node is not None:
            nodes.append(clip_node)
            clip_out = clip_node.out(0)

        if vae_node is not None:
            nodes.append(vae_node)
            vae_out = vae_node.out(0)
        
        return graph, unet_out, clip_out, vae_out

    def load_model(self, model_info, model_shifts=None) -> dict:
        graph, unet_out, clip_out, vae_out = self.prepare_model_graph(model_info)

        if model_shifts is not None:
            unet_out = create_model_shift_nodes_v2(graph, unet_out, model_shifts[0])

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

    def load_model_and_loras(self, model_info, model_shifts=None, lora_stack=None) -> dict:
        keywords = ""
        graph, unet_out, clip_out, vae_out = self.prepare_model_graph(model_info)

        if model_shifts is not None:
            logging.info(f"Applying model shifts: {model_shifts}")
            unet_out = create_model_shift_nodes_v2(graph, unet_out, model_shifts[0])

        # The lora_stack is supposed to be a list of tuples. INPUT_IS_LIST means it will be passed as a list.
        ## It's possible there could be no loras, in which case it will be an empty list.
        # If there is one lora, it will be a list with one tuple.

        if lora_stack is not None and len(lora_stack) == 1:
            lora_stack = lora_stack[0]
            # If lora_stack was [None], it will now be None.

        if lora_stack is not None and len(lora_stack) > 0:
            if len(lora_stack) == 1 and isinstance(lora_stack[0], list):
                lora_stack = lora_stack[0]

            logging.info(f"Applying LoRA stack: {lora_stack}")

            lora_paths = [folder_paths.get_full_path_or_raise("loras", lora[0]) for lora in lora_stack]
            pull_and_update_model_timestamp(lora_paths, model_type="lora")

            unet_out, clip_out = create_lora_nodes_v2(graph, unet_out, clip_out, lora_stack)
            keywords = get_lora_stack_keywords(lora_stack)

        return {
            "result": (unet_out, clip_out, vae_out, lora_stack, keywords),
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
        unet_node = add_unet_node_from_info(graph, unet_info)
        unet_out = unet_node.out(0) if unet_node else None
        if unet_node is None:
            raise ValueError("UNET info is missing or invalid.")
        else:
            pull_and_update_model_timestamp(unet_info["path"], model_type="unet")

        if model_shifts is not None and unet_out is not None:
            unet_out = create_model_shift_nodes_v2(graph, unet_out, model_shifts)

        if lora_stack is not None and unet_out is not None:
            lora_paths = [folder_paths.get_full_path_or_raise("loras", lora[0]) for lora in lora_stack]
            pull_and_update_model_timestamp(lora_paths, model_type="lora")

            unet_node = create_lora_nodes_model_only(graph, unet_out, lora_stack)
            unet_out = unet_node.out(0) if unet_node else None
            keywords = get_lora_stack_keywords(lora_stack)
        else:
            keywords = ""

        return {
            "result": (unet_out, lora_stack, keywords),
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
