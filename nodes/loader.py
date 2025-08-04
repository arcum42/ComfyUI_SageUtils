# Model nodes.
# This contains nodes involving models. Primarily loading models, but also includes nodes for model info and cache maintenance.

from __future__ import annotations
from comfy.comfy_types.node_typing import ComfyNodeABC, InputTypeDict, IO

import folder_paths

# Import specific utilities instead of wildcard import
from ..utils import get_lora_stack_keywords


import pathlib
import json
from ..utils import model_info as mi

from comfy_execution.graph_utils import GraphBuilder
from comfy.utils import ProgressBar
from ..utils.common import load_model_component

class Sage_UNETLoaderFromInfo(ComfyNodeABC):
    """Load UNET model component from model info."""
    
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
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

    def load_unet(self, unet_info) -> tuple:
        """Load UNET from model info."""
        print("Loading UNET...")
        return (load_model_component(unet_info, "UNET"),)

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

    def load_clip(self, clip_info) -> tuple:
        """Load CLIP from model info."""
        print("Loading CLIP...")
        return (load_model_component(clip_info, "CLIP"),)

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

    def load_vae(self, vae_info) -> tuple:
        """Load VAE from model info."""
        print("Loading VAE...")
        return (load_model_component(vae_info, "VAE"),)


class Sage_LoraStackLoader(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "model": (IO.MODEL, {"tooltip": "The diffusion model the LoRA will be applied to."}),
                "clip": (IO.CLIP, {"tooltip": "The CLIP model the LoRA will be applied to."})
            },
            "optional": {
                "lora_stack": ("LORA_STACK", {"defaultInput": True}),
                "model_shifts": ("MODEL_SHIFTS", {"defaultInput": True, "tooltip": "The model shifts & free_u2 settings to apply to the model."})
            }
        }

    RETURN_TYPES = (IO.MODEL, IO.CLIP, "LORA_STACK", IO.STRING)
    RETURN_NAMES = ("model", "clip", "lora_stack", "keywords")
    OUTPUT_TOOLTIPS = ("The modified diffusion model.", "The modified CLIP model.", "The stack of loras.", "Keywords from the lora stack.")
    FUNCTION = "load_lora"
    CATEGORY = "Sage Utils/lora"
    DESCRIPTION = "Accept a lora_stack with Model and Clip, and apply all the loras in the stack at once."

    def finalize(self, graph: GraphBuilder = None):
        pbar = ProgressBar(len(graph.nodes.items()))
        output = {}
        for node_id, node in graph.nodes.items():
            output[node_id] = node.serialize()
            pbar.update(1)
        return output

    def create_lora_nodes(self, graph: GraphBuilder, model, clip, lora_stack):
        lora_node = None
        for lora in lora_stack:
            lora_node = graph.node("LoraLoader",
                model=model,
                clip=clip,
                lora_name=lora[0],
                strength_model=lora[1],
                strength_clip=lora[2],
            )
            model = lora_node.out(0)
            clip = lora_node.out(1)
        return lora_node

    def create_model_shift_nodes(self, graph: GraphBuilder, lora_node, model, model_shifts):
        exit_node = lora_node
        if model_shifts is None:
            return exit_node
        if model_shifts["shift_type"] != "None":
            if model_shifts["shift_type"] == "x1":
                print("Applying x1 shift - AuraFlow/Lumina2")
                if lora_node is None:
                    exit_node = graph.node("ModelSamplingAuraFlow", model=model, shift=model_shifts["shift"])
                else:
                    exit_node = graph.node("ModelSamplingAuraFlow", model=lora_node.out(0), shift=model_shifts["shift"])
            elif model_shifts["shift_type"] == "x1000":
                print("Applying x1000 shift - SD3")
                if lora_node is None:
                    exit_node = graph.node("ModelSamplingSD3", model=model, shift=model_shifts["shift"])
                else:
                    exit_node = graph.node("ModelSamplingSD3", model=lora_node.out(0), shift=model_shifts["shift"])

        if model_shifts["freeu_v2"] == True:
            print("FreeU v2 is enabled, applying to model.")
            if exit_node is None:
                exit_node = graph.node("FreeU_V2",
                    model=model,
                    b1=model_shifts["b1"],
                    b2=model_shifts["b2"],
                    s1=model_shifts["s1"],
                    s2=model_shifts["s2"]
                )
            else:
                exit_node = graph.node("FreeU_V2",
                    model=exit_node.out(0),
                    b1=model_shifts["b1"],
                    b2=model_shifts["b2"],
                    s1=model_shifts["s1"],
                s2=model_shifts["s2"]
            )
        return exit_node

    def load_lora(self, model, clip, lora_stack=None, model_shifts=None) -> dict:
        # Use graph expansion to build a graph with lora loaders for each lora in the stack.
        if lora_stack is None and model_shifts is None:
            return {
                "result": (model, clip, None, ""),
            }

        graph = GraphBuilder()
        lora_node = None
        exit_node = None

        if lora_stack is not None:
            lora_node = self.create_lora_nodes(graph, model, clip, lora_stack)
        
        if model_shifts is not None:
            exit_node = self.create_model_shift_nodes(graph, lora_node, model, model_shifts)

        keywords = get_lora_stack_keywords(lora_stack)

        if exit_node is None:
            if lora_node is None:
                print("No loras in stack, returning original model and clip.")
                model_out = model
            else:
                print("No model shifts applied, returning original model.")
                model_out = lora_node.out(0)
        else:
            print("Model shifts applied, returning modified model.")
            model_out = exit_node.out(0)
        
        if lora_node is None:
            print("No loras in stack, returning original clip.")
            clip_out = clip
        else:
            print("Returning modified clip.")
            clip_out = lora_node.out(1)

        return {
            "result": (model_out, clip_out, lora_stack, keywords),
            "expand": self.finalize(graph)
        }

def get_path_without_base(folder_type:str, path:str) -> str:
    """Get the base path for a given folder type and path."""
    for base in folder_paths.get_folder_paths(folder_type):
        if path.startswith(base):
            path = path[len(base):].lstrip("/\\")
            break
    return path

def get_file_extension(path: str) -> str:
    """Get the file extension from a path."""
    return path.split(".")[-1] if "." in path else ""

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

        # We have a few scenerios to handle.
        # We need to loop over the model_info and see what types of models we have.
        # We'll worry about GGUF later.

        # If we have a checkpoint, we need to load it with a CheckpointLoaderSimple node.
        # If we have a UNET, we need to load it with a UNETLoader node.
        # If we have a CLIP, we need to load it with a CLIPLoader, DualCLIPLoader, TripleCLIPLoader, or QuadrupleCLIPLoader node.
        # If we have a VAE, we need to load it with a VAELoader node.
        # We aren't handing LoRAs in this node.
    
        # A checkpoint provides UNET, CLIP, and VAE. If we have the others, they will override the checkpoint components.
        # Most likely scenario is either a checkpoint, or UNET, CLIP, and VAE.
        # If we have a checkpoint, we will load it first, then load the others.

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
            ckpt_name = ckpt_info["path"]
            ckpt_fixed_name = get_path_without_base("checkpoints", ckpt_name)
            # No GGUF support for checkpoints yet that I see.
            ckpt_node = graph.node("CheckpointLoaderSimple",ckpt_name=ckpt_fixed_name)
        else:
            print("No checkpoint found in model info, skipping checkpoint loading.")
        
        # If we have a UNET, load it with the UNETLoader node.
        if unet_info is not None:
            unet_name = unet_info["path"]
            unet_weight_dtype = unet_info["weight_dtype"]
            unet_fixed_name = get_path_without_base("diffusion_models", unet_name)
            if get_file_extension(unet_fixed_name) == "gguf":
                # If the UNET is a GGUF, we need to use the GGUFLoader node. It doesn't ask for weight_dtype.
                try:
                    unet_node = graph.node("UnetLoaderGGUF", unet_name=unet_fixed_name)
                except:
                    print("Unable to load UNET as GGUF. Do you have ComfyUI-GGUF installed?")
                    raise ValueError("Unable to load UNET as GGUF. Do you have ComfyUI-GGUF installed?")
            else:
                unet_node = graph.node("UNETLoader", unet_name=unet_fixed_name, weight_dtype=unet_weight_dtype)

        # If we have a CLIP, load it with the appropriate CLIPLoader node.
        if clip_info is not None:
            # Only 1 or 2 clip loaders have a type. We have all the paths in an array.
            # 1+2 are in nodes.py, 3 is in node_sd3.py, and 4 is in nodes_hidream.py for legacy reasons.
            type_of_clip = clip_info["type"]
            clip_path = clip_info["path"]
            clip_fixed_path = [get_path_without_base("clip", path) for path in clip_path] if isinstance(clip_path, list) else get_path_without_base("clip", clip_path)
            clip_path = clip_fixed_path if isinstance(clip_fixed_path, list) else [clip_fixed_path]
            clip_type = clip_info["clip_type"]
            # If any of the clip paths are GGUF, we need to use the GGUF loader. It can also handle non-GGUF paths.
            if any(get_file_extension(path) == "gguf" for path in clip_path):
                try:
                    # If the CLIP is a GGUF, we need to use CLIPLoaderGGUF, DualCLIPLoaderGGUF, TripleCLIPLoaderGGUF, or QuadrupleCLIPLoaderGGUF nodes.
                    if type_of_clip == "Dual":
                        # Set clip_name1, clip_name2, and type
                        clip_node = graph.node("DualCLIPLoaderGGUF", clip_name1=clip_path[0], clip_name2=clip_path[1], type=clip_type)
                    elif type_of_clip == "Triple":
                        # Set clip_name1, clip_name2, and clip_name3
                        clip_node = graph.node("TripleCLIPLoaderGGUF", clip_name1=clip_path[0], clip_name2=clip_path[1], clip_name3=clip_path[2])
                    elif type_of_clip == "Quadruple":
                        # Set clip_name1, clip_name2, clip_name3, and clip_name4
                        clip_node = graph.node("QuadrupleCLIPLoaderGGUF", clip_name1=clip_path[0], clip_name2=clip_path[1], clip_name3=clip_path[2], clip_name4=clip_path[3])
                    else:
                        # Set clip_name and type
                        clip_node = graph.node("CLIPLoaderGGUF", clip_name=clip_path[0], type=clip_type)
                except:
                    print("Unable to load CLIP as GGUF. Do you have ComfyUI-GGUF installed?")
                    raise ValueError("Unable to load CLIP as GGUF. Do you have ComfyUI-GGUF installed?")
            else:
                if type_of_clip == "Dual":
                    # Set clip_name1, clip_name2, and type
                    clip_node = graph.node("DualCLIPLoader", clip_name1=clip_path[0], clip_name2=clip_path[1], type=clip_type)
                elif type_of_clip == "Triple":
                    # Set clip_name1, clip_name2, and clip_name3
                    clip_node = graph.node("TripleCLIPLoader", clip_name1=clip_path[0], clip_name2=clip_path[1], clip_name3=clip_path[2])
                elif type_of_clip == "Quadruple":
                    # Set clip_name1, clip_name2, clip_name3, and clip_name4
                    clip_node = graph.node("QuadrupleCLIPLoader", clip_name1=clip_path[0], clip_name2=clip_path[1], clip_name3=clip_path[2], clip_name4=clip_path[3])
                else:
                    # Set clip_name and type
                    clip_node = graph.node("CLIPLoader", clip_name=clip_path[0], type=clip_type)

        # If we have a VAE, load it with the VAELoader node.
        if vae_info is not None:
            vae_name = vae_info["path"]
            vae_fixed_name = get_path_without_base("vae", vae_name)
            # There is no GGUF for VAE currently, so we can just use VAELoader.
            vae_node = graph.node("VAELoader", vae_name=vae_fixed_name)

        # Now we need to connect the nodes together.
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

    def create_model_shift_nodes(self, graph, unet_in, model_shifts):
        unet_out = unet_in
        if model_shifts is None:
            return unet_out
        if model_shifts["shift_type"] != "None":
            if model_shifts["shift_type"] == "x1":
                print("Applying x1 shift - AuraFlow/Lumina2")
                exit_node = graph.node("ModelSamplingAuraFlow", model=unet_out, shift=model_shifts["shift"])
                unet_out = exit_node.out(0)
            elif model_shifts["shift_type"] == "x1000":
                print("Applying x1000 shift - SD3")
                exit_node = graph.node("ModelSamplingSD3", model=unet_out, shift=model_shifts["shift"])
                unet_out = exit_node.out(0)

        if model_shifts["freeu_v2"] == True:
            print("FreeU v2 is enabled, applying to model.")
            exit_node = graph.node("FreeU_V2",
                model=unet_out,
                b1=model_shifts["b1"],
                b2=model_shifts["b2"],
                s1=model_shifts["s1"],
                s2=model_shifts["s2"]
            )
            unet_out = exit_node.out(0)
        return unet_out

    def load_model(self, model_info, model_shifts=None) -> dict:
        graph, unet_out, clip_out, vae_out = self.prepare_model_graph(model_info)

        if model_shifts is not None:
            unet_out = self.create_model_shift_nodes(graph, unet_out, model_shifts[0])

        output = {}
        pbar = ProgressBar(len(graph.nodes.items()))
        for node_id, node in graph.nodes.items():
            output[node_id] = node.serialize()
            pbar.update(1)

        return {
            "result": (unet_out, clip_out, vae_out),
            "expand": output
        }

class Sage_ModelLoraStackLoader(Sage_LoadModelFromInfo):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "model_info": ("MODEL_INFO", {
                    "tooltip": "The model to load. Note: Should be from a info node, not a loader node, or the model will be loaded twice."
                }),
            },
            "optional": {
                "lora_stack": ("LORA_STACK", {"defaultInput": True, "tooltip": "The stack of loras to apply to the model."}),
                "model_shifts": ("MODEL_SHIFTS", { "tooltip": "The model shifts to apply." })
            }
        }

    RETURN_TYPES = (IO.MODEL, IO.CLIP, IO.VAE, "LORA_STACK", IO.STRING)
    RETURN_NAMES = ("model", "clip", "vae", "lora_stack", "keywords")
    INPUT_IS_LIST = True

    FUNCTION = "load_model_and_loras"
    CATEGORY = "Sage Utils/model"
    DESCRIPTION = "Load model components from model info using GraphBuilder."

    def create_lora_nodes(self, graph: GraphBuilder, unet_in, clip_in, lora_stack=None):
        unet_out = unet_in
        clip_out = clip_in

        if lora_stack is None:
            return unet_out, clip_out
        for lora in lora_stack:
            lora_node = graph.node("LoraLoader",
                model=unet_in,
                clip=clip_in,
                lora_name=lora[0],
                strength_model=lora[1],
                strength_clip=lora[2],
            )
            unet_out = lora_node.out(0)
            clip_out = lora_node.out(1)
        return unet_out, clip_out

    def load_model_and_loras(self, model_info, model_shifts=None, lora_stack=None) -> dict:
        keywords = ""
        graph, unet_out, clip_out, vae_out = self.prepare_model_graph(model_info)

        if model_shifts is not None:
            print(f"Applying model shifts: {model_shifts}")
            unet_out = self.create_model_shift_nodes(graph, unet_out, model_shifts[0])

        if lora_stack is not None:
            if isinstance(lora_stack, list):
                lora_stack = lora_stack[0]
            print(f"Applying LoRA stack: {lora_stack}")
            unet_out, clip_out = self.create_lora_nodes(graph, unet_out, clip_out, lora_stack)
            keywords = get_lora_stack_keywords(lora_stack)

        output = {}
        pbar = ProgressBar(len(graph.nodes.items()))
        for node_id, node in graph.nodes.items():
            output[node_id] = node.serialize()
            pbar.update(1)

        return {
            "result": (unet_out, clip_out, vae_out, lora_stack, keywords),
            "expand": output
        }
