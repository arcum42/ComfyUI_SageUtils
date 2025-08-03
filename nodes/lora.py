# Lora nodes
# This includes nodes involving loras and lora stacks.

from __future__ import annotations
from comfy.comfy_types.node_typing import ComfyNodeABC, InputTypeDict, IO
import folder_paths
from comfy.utils import ProgressBar
from comfy_execution.graph_utils import GraphBuilder

# Import specific utilities instead of wildcard import
from ..utils import (
    cache, get_lora_stack_keywords, add_lora_to_stack,
    pull_metadata, get_latest_model_version, loaders
)
from ..utils.common import unwrap_tuple, get_model_types, load_model_component

class Sage_LoraStack(ComfyNodeABC):
    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        lora_list = folder_paths.get_filename_list("loras")
        return {
            "required": {
                "enabled": (IO.BOOLEAN, {"defaultInput": False, "default": True}),
                "lora_name": (lora_list, {"defaultInput": False, "tooltip": "The name of the LoRA."}),
                "model_weight": (IO.FLOAT, {"defaultInput": False, "default": 1.0, "min": -100.0, "max": 100.0, "step": 0.01, "tooltip": "How strongly to modify the diffusion model. This value can be negative."}),
                "clip_weight": (IO.FLOAT, {"defaultInput": False, "default": 1.0, "min": -100.0, "max": 100.0, "step": 0.01, "tooltip": "How strongly to modify the CLIP model. This value can be negative."}),
                },
            "optional": {
                "lora_stack": ("LORA_STACK", {"defaultInput": True}),
            }
        }

    RETURN_TYPES = ("LORA_STACK",)
    RETURN_NAMES = ("lora_stack",)

    FUNCTION = "add_to_stack"
    CATEGORY = "Sage Utils/lora"
    DESCRIPTION = "Choose a lora with weights, and add it to a lora_stack. Compatable with other node packs that have lora_stacks."

    def add_to_stack(self, enabled, lora_name, model_weight, clip_weight, lora_stack = None) -> tuple:
        if enabled == True:
            stack = add_lora_to_stack(lora_name, model_weight, clip_weight, lora_stack)
        else:
            stack = lora_stack

        return (stack,)

class Sage_QuickLoraStack(Sage_LoraStack):
    
    """A simplified version of the lora stack node, without the clip_weight."""
    def __init__(self):
        super().__init__()
    
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        lora_list = folder_paths.get_filename_list("loras")
        return {
            "required": {
                "enabled": (IO.BOOLEAN, {"defaultInput": False, "default": True}),
                "lora_name": (lora_list, {"defaultInput": False, "tooltip": "The name of the LoRA."}),
                "model_weight": (IO.FLOAT, {"defaultInput": False, "default": 1.0, "min": -100.0, "max": 100.0, "step": 0.01, "tooltip": "How strongly to modify the diffusion model. This value can be negative."}),
                },
            "optional": {
                "lora_stack": ("LORA_STACK", {"defaultInput": True}),
            }
        }
    
    FUNCTION = "add_to_stack"
    DESCRIPTION = "Choose a lora with model weight only, and add it to a lora_stack. Clip weight set to 1. Compatable with other node packs that have lora_stacks."
    def add_to_stack(self, enabled, lora_name, model_weight, lora_stack = None) -> tuple:
        if enabled == True:
            stack = add_lora_to_stack(lora_name, model_weight, 1.0, lora_stack)
        else:
            stack = lora_stack

        return (stack,)

#example usage of graph builder:
# encoder_node = graph.node("VAEEncode", pixels = image, vae = vae)
class Sage_TripleLoraStack(ComfyNodeABC):
    NUM_OF_ENTRIES = 3
    def __init__(self):
        self.NUM_OF_ENTRIES = Sage_TripleQuickLoraStack.NUM_OF_ENTRIES
        super().__init__()

    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        lora_list = folder_paths.get_filename_list("loras")
        required_list = {}
        for i in range(1, cls.NUM_OF_ENTRIES + 1):
            required_list[f"enabled_{i}"] = (IO.BOOLEAN, {"defaultInput": False, "default": True})
            required_list[f"lora_{i}_name"] = (lora_list, {"options": lora_list, "defaultInput": False, "tooltip": "The name of the LoRA."})
            required_list[f"model_{i}_weight"] = (IO.FLOAT, {"defaultInput": False, "default": 1.0, "min": -100.0, "max": 100.0, "step": 0.01, "tooltip": "How strongly to modify the diffusion model. This value can be negative."})
            required_list[f"clip_{i}_weight"] = (IO.FLOAT, {"defaultInput": False, "default": 1.0, "min": -100.0, "max": 100.0, "step": 0.01, "tooltip": "How strongly to modify the CLIP model. This value can be negative."})

        return {
            "required": required_list,
            "optional": {
                "lora_stack": ("LORA_STACK", {"defaultInput": True})
            }
        }

    RETURN_TYPES = ("LORA_STACK",)
    RETURN_NAMES = ("lora_stack",)

    FUNCTION = "add_to_stack"
    CATEGORY = "Sage Utils/lora"
    DESCRIPTION = "Choose three loras with weights, and add them to a lora_stack. Compatable with other node packs that have lora_stacks."

    def lora_stack_node(self, graph: GraphBuilder, args, idx, lora_stack = None):
        lora_enabled = args[f"enabled_{idx}"]
        lora_name = args[f"lora_{idx}_name"]
        model_weight = args[f"model_{idx}_weight"]
        clip_weight = args[f"clip_{idx}_weight"]

        return graph.node("Sage_LoraStack",
                enabled = lora_enabled,
                lora_name = lora_name,
                model_weight = model_weight,
                clip_weight = clip_weight,
                lora_stack = lora_stack
            )

    def add_to_stack(self, **args):
        graph = GraphBuilder()
        stack = args.get("lora_stack", None)
        nodes = []
        lora_stack_node = None

        for i in range(1, len(args) // 4 + 1):
            if args[f"enabled_{i}"] == False:
                continue
            stack_out = stack if lora_stack_node is None else lora_stack_node.out(0)
            lora_stack_node = self.lora_stack_node(graph, args, i, stack_out)
            nodes.append(lora_stack_node)

        if not nodes:
            return (stack,)

        return {
            "result": (nodes[-1].out(0),),
            "expand": graph.finalize()
        }

class Sage_TripleQuickLoraStack(ComfyNodeABC):
    NUM_OF_ENTRIES = 3
    def __init__(self):
        self.NUM_OF_ENTRIES = Sage_TripleQuickLoraStack.NUM_OF_ENTRIES
        super().__init__()

    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        lora_list = folder_paths.get_filename_list("loras")
        required_list = {}
        for i in range(1, cls.NUM_OF_ENTRIES + 1):
            required_list[f"enabled_{i}"] = (IO.BOOLEAN, {"defaultInput": False, "default": True})
            required_list[f"lora_{i}_name"] = (lora_list, {"options": lora_list, "defaultInput": False, "tooltip": "The name of the LoRA."})
            required_list[f"model_{i}_weight"] = (IO.FLOAT, {"defaultInput": False, "default": 1.0, "min": -100.0, "max": 100.0, "step": 0.01, "tooltip": "How strongly to modify the diffusion model. This value can be negative."})

        return {
            "required": required_list,
            "optional": {
                "lora_stack": ("LORA_STACK", {"defaultInput": True})
            }
        }

    RETURN_TYPES = ("LORA_STACK",)
    RETURN_NAMES = ("lora_stack",)

    FUNCTION = "add_to_stack"
    CATEGORY = "Sage Utils/lora"
    DESCRIPTION = "Choose three loras with weights, and add them to a lora_stack. Compatable with other node packs that have lora_stacks."

    def lora_stack_node(self, graph: GraphBuilder, args, idx, lora_stack = None):
        lora_enabled = args[f"enabled_{idx}"]
        lora_name = args[f"lora_{idx}_name"]
        model_weight = args[f"model_{idx}_weight"]
        clip_weight = 1.0

        return graph.node("Sage_LoraStack",
                enabled = lora_enabled,
                lora_name = lora_name,
                model_weight = model_weight,
                clip_weight = clip_weight,
                lora_stack = lora_stack
            )

    def add_to_stack(self, **args):
        graph = GraphBuilder()
        stack = args.get("lora_stack", None)
        nodes = []
        lora_stack_node = None

        for i in range(1, len(args) // 3 + 1):
            if args[f"enabled_{i}"] == False:
                continue
            stack_out = stack if lora_stack_node is None else lora_stack_node.out(0)
            lora_stack_node = self.lora_stack_node(graph, args, i, stack_out)
            nodes.append(lora_stack_node)

        if not nodes:
            return (stack,)

        return {
            "result": (nodes[-1].out(0),),
            "expand": graph.finalize()
        }


class Sage_QuickSixLoraStack(Sage_TripleQuickLoraStack):
    NUM_OF_ENTRIES = 6

class Sage_QuickNineLoraStack(Sage_TripleQuickLoraStack):
    NUM_OF_ENTRIES = 9

class Sage_SixLoraStack(Sage_TripleLoraStack):
    NUM_OF_ENTRIES = 6

class Sage_CollectKeywordsFromLoraStack(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "lora_stack": ("LORA_STACK", {"defaultInput": True})
            }
        }

    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ("keywords",)

    FUNCTION = "get_keywords"

    CATEGORY = "Sage Utils/lora"
    DESCRIPTION = "Go through each model in the lora stack, grab any keywords from civitai, and combine them into one string. Place at the end of a lora_stack, or you won't get keywords for the entire stack."

    def get_keywords(self, lora_stack) -> tuple:
        if lora_stack is None:
            return ("",)

        return (get_lora_stack_keywords(lora_stack),)

class Sage_CheckLorasForUpdates(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "lora_stack": ("LORA_STACK", {"defaultInput": True}),
                "force": (IO.BOOLEAN, {"defaultInput": False, "default": False, "tooltip": "Force a check for updates, even if the lora is up to date."}),
            }
        }

    RETURN_TYPES = ("LORA_STACK", IO.STRING, IO.STRING)
    RETURN_NAMES = ("lora_stack", "path", "latest_url")

    FUNCTION = "check_for_updates"

    CATEGORY = "Sage Utils/lora"
    DESCRIPTION = "Check the loras in the stack for updates. If an update is found, it will be downloaded and the lora will be replaced in the stack."

    def check_for_updates(self, lora_stack, force) -> tuple:
        if lora_stack is None:
            return (None, "", "")
        
        lora_list = []
        lora_url_list = []

        for i, lora in enumerate(lora_stack):
            if lora is not None:
                print(f"Checking {lora[0]} for updates...")
                lora_path = folder_paths.get_full_path_or_raise("loras", lora[0])
                pull_metadata(lora_path, timestamp=False, force_all=force)
                print(f"Update check complete for {lora[0]}")
                
                if "update_available" in cache.by_path(lora_path):
                    if cache.by_path(lora_path)["update_available"] == True:
                        model_id = cache.by_path(lora_path)["modelId"]
                        latest_version = get_latest_model_version(model_id)
                        latest_url = f"https://civitai.com/models/{model_id}?modelVersionId={latest_version}"
                        if latest_url is not None:
                            print(f"Update found for {lora[0]}")
                            lora_url_list.append(latest_url)
                            lora_list.append(lora_path)
                
        return (lora_stack, str(lora_list), str(lora_url_list))

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

class Sage_LoadModelwithGraphBuilderTest(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "model_info": ("MODEL_INFO", {
                    "tooltip": "The model to load. Note: Should be from a info node, not a loader node, or the model will be loaded twice."
                }),
            }
        }

    RETURN_TYPES = (IO.MODEL, IO.CLIP, IO.VAE)
    RETURN_NAMES = ("model", "clip", "vae")
    INPUT_IS_LIST = True

    FUNCTION = "load_model"
    CATEGORY = "Sage Utils/model"
    DESCRIPTION = "Load model components from model info using GraphBuilder."

    def load_model(self, model_info):
        graph = GraphBuilder()
        nodes = []
        ckpt_node = None
        unet_node = None
        clip_node = None
        vae_node = None

        clip_out = None
        unet_out = None
        vae_out = None
        
        # We have a few scenerios to handle.
        # We need to loop over the model_info and see what types of models we have.
        # We'll worry about GGUF later.

        # If we have a checkpoint, we need to load it with a CheckpointLoaderSimple node.
        # If we have a UNET, we need to load it with a UNETLoader node.
        # If we have a CLIP, we need to load it with a CLIPLoader, DualCLIPLoader, TripleCLIPLoader, or QuadrupleCLIPLoader node.
        # If we have a VAE, we need to load it with a VAELoader node.
        # We aren't handing LoRAs in this node.
    
        # A checkpoint provides UNET, CLIP, and VAE. If we have the others, they will override the checkpoint components.
        # Most likely scenerio is either a checkpoint, or UNET, CLIP, and VAE.
        # If we have a checkpoint, we will load it first, then load the others.
        
        ckpt_info = None
        unet_info = None
        clip_info = None
        vae_info = None

        # Loop through the model_info to determine what types of models we have, and record their indices.
        # Don't use get_model_types here. Seriously, don't.
        #print(f"Model info type is {type(model_info)}; items: {model_info}")
        # Model info type is <class 'list'>; items: [{'type': 'CKPT', 'path': '/home/ai/models/checkpoints/ponyXL/ponyDiffusionV6XL_v6.safetensors', 'hash': 'f7564bb179'}]
        # Checking model info item 0: {'type': 'CKPT', 'path': '/home/ai/models/checkpoints/ponyXL/ponyDiffusionV6XL_v6.safetensors', 'hash': 'f7564bb179'}

        # Model info type is <class 'list'>; items: [({'type': 'UNET', 'path': '/home/ai/models/diffusion_models/chroma/chroma-unlocked-v48_float8_e4m3fn_scaled_learned_nodistill.safetensors', 'hash': '727416bfb5', 'weight_dtype': 'default'}, {'type': 'CLIP', 'path': ['/home/ai/models/clip/t5/t5xxl_fp8_e4m3fn_scaled.safetensors'], 'hash': ['a498f0485d'], 'clip_type': 'chroma'}, {'type': 'VAE', 'path': '/home/ai/models/vae/ae.safetensors', 'hash': 'afc8e28272'})]
        # Checking model info item 0: ({'type': 'UNET', 'path': '/home/ai/models/diffusion_models/chroma/chroma-unlocked-v48_float8_e4m3fn_scaled_learned_nodistill.safetensors', 'hash': '727416bfb5', 'weight_dtype': 'default'}, {'type': 'CLIP', 'path': ['/home/ai/models/clip/t5/t5xxl_fp8_e4m3fn_scaled.safetensors'], 'hash': ['a498f0485d'], 'clip_type': 'chroma'}, {'type': 'VAE', 'path': '/home/ai/models/vae/ae.safetensors', 'hash': 'afc8e28272'})
        # No checkpoint found in model info, skipping checkpoint loading.

        # model_info is either a list of dicts, or a list of tuples with dicts inside. Either way, we need to go over each dict, and check the "type" key.
        
        print(f"Model info type is {type(model_info)}; items: {model_info}")
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
        
        print(f"Model info type is now {type(model_info)}; items: {model_info}")

        for idx, item in enumerate(model_info):
            print(f"Checking model info item {idx}: {item}")
            # Remove the tuple check since we've already flattened the structure
            key = item["type"]
            if key == "CKPT":
                ckpt_info = item
                print(f"Found checkpoint info: {ckpt_info}")
            elif key == "UNET":
                unet_info = item
                print(f"Found UNET info: {unet_info}")
            elif key == "CLIP":
                clip_info = item
                print(f"Found CLIP info: {clip_info}")
            elif key == "VAE":
                vae_info = item
                print(f"Found VAE info: {vae_info}")

        if ckpt_info is not None:
            ckpt_name = ckpt_info["path"]
            ckpt_fixed_name = get_path_without_base("checkpoints", ckpt_name)
            ckpt_node = graph.node("CheckpointLoaderSimple",ckpt_name=ckpt_fixed_name)
            print(f"Checkpoint node created with name: {ckpt_fixed_name}")
        else:
            print("No checkpoint found in model info, skipping checkpoint loading.")
        
        # If we have a UNET, load it with the UNETLoader node.
        if unet_info is not None:
            unet_name = unet_info["path"]
            unet_weight_dtype = unet_info["weight_dtype"]
            unet_fixed_name = get_path_without_base("diffusion_models", unet_name)
            unet_node = graph.node("UNETLoader", unet_name=unet_fixed_name, weight_dtype=unet_weight_dtype)
            print(f"UNET node created with name: {unet_fixed_name}, weight_dtype: {unet_weight_dtype}")

        # If we have a CLIP, load it with the appropriate CLIPLoader node.
        if clip_info is not None:
            # Only 1 or 2 clip loaders have a type. We have all the paths in an array.
            # 1+2 are in nodes.py, 3 is in node_sd3.py, and 4 is in nodes_hidream.py for legacy reasons.
            type_of_clip = clip_info["type"]
            clip_path = clip_info["path"]
            clip_fixed_path = [get_path_without_base("clip", path) for path in clip_path] if isinstance(clip_path, list) else get_path_without_base("clip", clip_path)
            clip_path = clip_fixed_path if isinstance(clip_fixed_path, list) else [clip_fixed_path]
            clip_type = clip_info["clip_type"]
            print(f"Loading CLIP with type: {type_of_clip}, path: {clip_path}, clip_type: {clip_type}")
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
            vae_node = graph.node("VAELoader", vae_name=vae_fixed_name)
            print(f"VAE node created with name: {vae_fixed_name}")

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
        
        print(f"Loaded model: {unet_out}, clip: {clip_out}, vae: {vae_out}")

        return {
            "result": (unet_out, clip_out, vae_out),
            "expand": graph.finalize()
        }

class Sage_LoadModelFromInfo(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "model_info": ("MODEL_INFO", {
                    "tooltip": "The model to load. Note: Should be from a info node, not a loader node, or the model will be loaded twice."
                }),
            }
        }

    RETURN_TYPES = (IO.MODEL, IO.CLIP, IO.VAE)
    RETURN_NAMES = ("model", "clip", "vae")

    FUNCTION = "load_model"
    CATEGORY = "Sage Utils/model"
    DESCRIPTION = "Load model components from model info."
    
    def load_model(self, model_info) -> tuple:
        # Initialize components
        model = clip = vae = None
        model_types = get_model_types(model_info)
        total_operations = len(model_types)
        pbar = ProgressBar(total_operations)

        if "CKPT" in model_types:
            model, clip, vae = load_model_component(model_info, "CKPT", pbar)
        
        # Load individual components (override checkpoint components if present)
        if "CLIP" in model_types:
            clip = unwrap_tuple(load_model_component(model_info, "CLIP", pbar))

        if "VAE" in model_types:
            vae = unwrap_tuple(load_model_component(model_info, "VAE", pbar))

        if "UNET" in model_types:
            model = unwrap_tuple(load_model_component(model_info, "UNET", pbar))

        return (model, clip, vae)

class Sage_ModelLoraStackLoader(Sage_LoraStackLoader):
    """Load model components from model info and apply LoRA stack."""
    
    def __init__(self):
        super().__init__()

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "model_info": ("MODEL_INFO", {
                    "tooltip": "The diffusion model the LoRA will be applied to. "
                              "Note: Should be from the checkpoint info node, not a loader node, "
                              "or the model will be loaded twice."
                }),
            },
            "optional": {
                "lora_stack": ("LORA_STACK", {"defaultInput": True}),
                "model_shifts": ("MODEL_SHIFTS", {
                    "defaultInput": True, 
                    "tooltip": "The model shifts & free_u2 settings to apply to the model."
                }),
            }
        }

    RETURN_TYPES = (IO.MODEL, IO.CLIP, IO.VAE, "LORA_STACK", IO.STRING)
    RETURN_NAMES = ("model", "clip", "vae", "lora_stack", "keywords")
    OUTPUT_TOOLTIPS = (
        "The modified diffusion model.", 
        "The modified CLIP model.", 
        "The VAE model.", 
        "The stack of loras.", 
        "Keywords from the lora stack."
    )

    FUNCTION = "load_everything"
    CATEGORY = "Sage Utils/model"
    DESCRIPTION = ("Accept model info and a lora_stack, load the model, and apply all the "
                  "loras in the stack to it at once. Apply changes to the model after loading it.")

    def load_everything(self, model_info, lora_stack=None, model_shifts=None) -> dict:
        # Load model components
        model, clip, vae = Sage_LoadModelFromInfo().load_model(model_info)
        print(f"Loaded model: {model}, clip: {clip}, vae: {vae}")

        if lora_stack is None and model_shifts is None:
            return {
                "result": (model, clip, vae, None, ""),
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
            "result": (model_out, clip_out, vae, lora_stack, keywords),
            "expand": self.finalize(graph)
        }

class Sage_ModelShifts(ComfyNodeABC):
    def __init__(self):
        pass
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "shift_type": (["None", "x1", "x1000"], {"defaultInput": True, "tooltip": "The type of shift to apply to the model. x1 for Auraflow and Lumina2, x1000 for other models."}),
                "shift": (IO.FLOAT, {"defaultInput": False, "default": 3.0, "min": 0.0, "max": 100.0, "step": 0.01}),
                "freeu_v2": (IO.BOOLEAN, {"defaultInput": False, "default": False}),
                "b1": (IO.FLOAT, {"defaultInput": False, "default": 1.3, "min": 0.0, "max": 10.0, "step": 0.01}),
                "b2": (IO.FLOAT, {"defaultInput": False, "default": 1.4, "min": 0.0, "max": 10.0, "step": 0.01}),
                "s1": (IO.FLOAT, {"defaultInput": False, "default": 0.9, "min": 0.0, "max": 10.0, "step": 0.01}),
                "s2": (IO.FLOAT, {"defaultInput": False, "default": 0.2, "min": 0.0, "max": 10.0, "step": 0.01}),
                },
            }
    RETURN_TYPES = ("MODEL_SHIFTS",)
    RETURN_NAMES = ("model_shifts",)
    FUNCTION = "get_model_shifts"
    CATEGORY = "Sage Utils/model"
    DESCRIPTION = "Get the model shifts and free_u2 settings to apply to the model. This is used by the model loader node."
    def get_model_shifts(self, shift_type, shift, freeu_v2, b1, b2, s1, s2) -> tuple:
        return ({
            "shift_type": shift_type,
            "shift": shift,
            "freeu_v2": freeu_v2,
            "b1": b1,
            "b2": b2,
            "s1": s1,
            "s2": s2
        },)

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
