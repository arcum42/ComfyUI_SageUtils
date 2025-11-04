from comfy_execution.graph_utils import GraphBuilder
from .helpers import (
    get_path_without_base,
    get_file_extension,
    pull_and_update_model_timestamp
    )

import logging

# Utility function
def flatten_model_info(model_info):
    """Flatten model_info to a list of dictionaries."""
    if isinstance(model_info, list):
        flattened_info = []
        for item in model_info:
            if isinstance(item, tuple):
                # Unpack the tuple and add all dictionaries to the flattened list
                flattened_info.extend(item)
            else:
                flattened_info.append(item)
    else:
        # If model_info is not a list, we need to convert it to a list.
        flattened_info = [model_info]
    return flattened_info

# Add individual model loader nodes
def add_ckpt_node(graph: GraphBuilder, ckpt_info):
    ckpt_node = None
    if ckpt_info is not None:
        ckpt_name = ckpt_info["path"]
        ckpt_fixed_name = get_path_without_base("checkpoints", ckpt_name)
        # No GGUF support for checkpoints yet that I see.
        print(f"Added node CheckpointLoaderSimple with ckpt_name: {ckpt_fixed_name}")
        ckpt_node = graph.node("CheckpointLoaderSimple",ckpt_name=ckpt_fixed_name)
    else:
        print("No checkpoint found in model info, skipping checkpoint loading.")
    return ckpt_node

def add_unet_node(graph: GraphBuilder, unet_info):
    unet_node = None
    if unet_info is not None:
        unet_name = unet_info["path"]
        unet_weight_dtype = unet_info["weight_dtype"]
        unet_fixed_name = get_path_without_base("diffusion_models", unet_name)
        if get_file_extension(unet_fixed_name) == "gguf":
            # If the UNET is a GGUF, we need to use the GGUFLoader node. It doesn't ask for weight_dtype.
            try:
                print(f"Added node UnetLoaderGGUF with unet_name: {unet_fixed_name}")
                unet_node = graph.node("UnetLoaderGGUF", unet_name=unet_fixed_name)
            except:
                print("Unable to load UNET as GGUF. Do you have ComfyUI-GGUF installed?")
                raise ValueError("Unable to load UNET as GGUF. Do you have ComfyUI-GGUF installed?")
        else:
            print(f"Added node UNETLoader with unet_name: {unet_fixed_name} and weight_dtype: {unet_weight_dtype}")
            unet_node = graph.node("UNETLoader", unet_name=unet_fixed_name, weight_dtype=unet_weight_dtype)
    return unet_node

def add_clip_node(graph: GraphBuilder, clip_info):
    clip_node = None
    if clip_info is not None:
        print(f"Adding CLIP node with info: {clip_info}")
        # 1+2 are in nodes.py, 3 is in node_sd3.py, and 4 is in nodes_hidream.py for legacy reasons.
        clip_path = clip_info["path"]
        clip_num = len(clip_path) if isinstance(clip_path, list) else 1
        clip_fixed_path = [get_path_without_base("clip", path) for path in clip_path] if isinstance(clip_path, list) else get_path_without_base("clip", clip_path)
        clip_path = clip_fixed_path if isinstance(clip_fixed_path, list) else [clip_fixed_path]
        clip_type = clip_info["clip_type"]
        print(f"Clip Path: {clip_path} Clip Type: {clip_type}")

        # If any of the clip paths are GGUF, we need to use the GGUF loader. It can also handle non-GGUF paths.
        if any(get_file_extension(path) == "gguf" for path in clip_path):
            print("GGUF Clip!")
            try:
                if clip_num == 1:
                    print(f"Added node CLIPLoaderGGUF with clip_name: {clip_path[0]}, type: {clip_type}")
                    clip_node = graph.node("CLIPLoaderGGUF", clip_name=clip_path[0], type=clip_type)
                elif clip_num == 2:
                    print(f"Added node DualCLIPLoaderGGUF with clip_name1: {clip_path[0]}, clip_name2: {clip_path[1]}, type: {clip_type}")
                    clip_node = graph.node("DualCLIPLoaderGGUF", clip_name1=clip_path[0], clip_name2=clip_path[1], type=clip_type)
                elif clip_num == 3:
                    print(f"Added node TripleCLIPLoaderGGUF with clip_name1: {clip_path[0]}, clip_name2: {clip_path[1]}, clip_name3: {clip_path[2]}")
                    clip_node = graph.node("TripleCLIPLoaderGGUF", clip_name1=clip_path[0], clip_name2=clip_path[1], clip_name3=clip_path[2])
                else:
                    print(f"Added node QuadrupleCLIPLoaderGGUF with clip_name1: {clip_path[0]}, clip_name2: {clip_path[1]}, clip_name3: {clip_path[2]}, clip_name4: {clip_path[3]}")
                    clip_node = graph.node("QuadrupleCLIPLoaderGGUF", clip_name1=clip_path[0], clip_name2=clip_path[1], clip_name3=clip_path[2], clip_name4=clip_path[3])
            except:
                print("Unable to load CLIP as GGUF. Do you have ComfyUI-GGUF installed?")
                raise ValueError("Unable to load CLIP as GGUF. Do you have ComfyUI-GGUF installed?")
        else:
            if clip_num == 1:
                print(f"Added node CLIPLoader with clip_name: {clip_path[0]}, type: {clip_type}")
                clip_node = graph.node("CLIPLoader", clip_name=clip_path[0], type=clip_type)
            elif clip_num == 2:
                print(f"Added node DualCLIPLoader with clip_name1: {clip_path[0]}, clip_name2: {clip_path[1]}, type: {clip_type}")
                clip_node = graph.node("DualCLIPLoader", clip_name1=clip_path[0], clip_name2=clip_path[1], type=clip_type)
            elif clip_num == 3:
                print(f"Added node TripleCLIPLoader with clip_name1: {clip_path[0]}, clip_name2: {clip_path[1]}, clip_name3: {clip_path[2]}")
                clip_node = graph.node("TripleCLIPLoader", clip_name1=clip_path[0], clip_name2=clip_path[1], clip_name3=clip_path[2])
            else:
                print(f"Added node QuadrupleCLIPLoader with clip_name1: {clip_path[0]}, clip_name2: {clip_path[1]}, clip_name3: {clip_path[2]}, clip_name4: {clip_path[3]}")
                clip_node = graph.node("QuadrupleCLIPLoader", clip_name1=clip_path[0], clip_name2=clip_path[1], clip_name3=clip_path[2], clip_name4=clip_path[3])
    return clip_node

def add_vae_node(graph: GraphBuilder, vae_info):
    vae_node = None
    if vae_info is not None:
        vae_name = vae_info["path"]
        vae_fixed_name = get_path_without_base("vae", vae_name)
        # There is no GGUF for VAE currently, so we can just use VAELoader.
        print(f"Added node VAELoader with vae_name: {vae_fixed_name}")
        vae_node = graph.node("VAELoader", vae_name=vae_fixed_name)
    return vae_node

# Add model loader nodes for checkpoints, unet, clip, or vae.
def create_model_loader_nodes(graph: GraphBuilder, model_info):
    ckpt_node = unet_node = clip_node = vae_node = None
    unet_out = clip_out = vae_out = None
    model_present = {"CKPT": None, "UNET": None, "CLIP": None, "VAE": None}

    # model_info is either a list of dicts, or a list of tuples with dicts inside. Either way, we need to go over each dict, and check the "type" key.
    model_info = flatten_model_info(model_info)

    for idx, item in enumerate(model_info):
        model_present[item["type"]] = item

    if model_present["CKPT"] is not None:
        ckpt_node = add_ckpt_node(graph, model_present["CKPT"])
        if ckpt_node is None:
            raise ValueError("Checkpoint info is missing or invalid.")
        else:
            pull_and_update_model_timestamp(model_present["CKPT"]["path"], model_type="ckpt")
            unet_out = ckpt_node.out(0)
            clip_out = ckpt_node.out(1)
            vae_out = ckpt_node.out(2)

    # If we have a UNET, load it with the UNETLoader node.
    if model_present["UNET"] is not None:
        unet_node = add_unet_node(graph, model_present["UNET"])

        if unet_node is None:
            raise ValueError("UNET info is missing or invalid.")
        else:
            pull_and_update_model_timestamp(model_present["UNET"]["path"], model_type="unet")
        unet_out = unet_node.out(0)

    # If we have a CLIP, load it with the appropriate CLIPLoader node.
    if model_present["CLIP"] is not None:
        clip_node = add_clip_node(graph, model_present["CLIP"])
        if clip_node is None:
            raise ValueError("CLIP info is missing or invalid.")
        else:
            pull_and_update_model_timestamp(model_present["CLIP"]["path"], model_type="clip")
            clip_out = clip_node.out(0)

    # If we have a VAE, load it with the VAELoader node.
    if model_present["VAE"] is not None:
        vae_node = add_vae_node(graph, model_present["VAE"])
        if vae_node is None:
            raise ValueError("VAE info is missing or invalid.")
        else:
            pull_and_update_model_timestamp(model_present["VAE"]["path"], model_type="vae")
            vae_out = vae_node.out(0)
    return unet_out, clip_out, vae_out

# Add lora nodes for a lora stack.
def create_lora_nodes(graph: GraphBuilder, unet_in, clip_in=None, lora_stack=None):
    exit_unet = unet_in
    exit_clip = clip_in
    exit_node = None
    
    if lora_stack is None:
        logging.info("No loras in stack.")
        return exit_node, exit_unet, exit_clip

    if exit_clip is not None:
        logging.info("Using CLIP with loras.")
        for lora in lora_stack:
            logging.info(f"Applying lora: {lora[0]}, unet: {lora[1]}, clip: {lora[2]}")
            exit_node = graph.node("LoraLoader", model=exit_unet, clip=exit_clip, lora_name=lora[0], strength_model=lora[1], strength_clip=lora[2])
            exit_unet = exit_node.out(0)
            exit_clip = exit_node.out(1)
        return exit_node, exit_unet, exit_clip

    logging.info("Using Model Only loras.")
    for lora in lora_stack:
        logging.info(f"Applying lora: {lora[0]}, unet: {lora[1]}")
        exit_node = graph.node("LoraLoaderModelOnly", model=exit_unet, lora_name=lora[0], strength_model=lora[1])
        exit_unet = exit_node.out(0)
    return exit_node, exit_unet, exit_clip

# Add an actual model shift node.
def create_shift_node(graph: GraphBuilder, unet_in, model_shifts):
    exit_node = None
    unet_out = unet_in

    if model_shifts is not None and model_shifts["shift_type"] != "None":
        if model_shifts["shift_type"] == "x1":
            logging.info(f"Applying x1 shift - AuraFlow/Lumina2. Shift: {model_shifts['shift']}")
            exit_node = graph.node("ModelSamplingAuraFlow", model=unet_out, shift=model_shifts["shift"])
            unet_out = exit_node.out(0)
        elif model_shifts["shift_type"] == "x1000":
            logging.info(f"Applying x1000 shift - SD3. Shift: {model_shifts['shift']}")
            exit_node = graph.node("ModelSamplingSD3", model=unet_out, shift=model_shifts["shift"])
            unet_out = exit_node.out(0)

    return exit_node, unet_out

# Add FreeU v2 node if specified.
def create_freeu_v2_node(graph: GraphBuilder, unet_in, model_shifts):
    exit_node = None
    unet_out = unet_in

    if model_shifts is not None and model_shifts.get("freeu_v2", False) == True:
        logging.info(f"FreeU v2 is enabled, applying to model. b1: {model_shifts['b1']}, b2: {model_shifts['b2']}, s1: {model_shifts['s1']}, s2: {model_shifts['s2']}")
        exit_node = graph.node("FreeU_V2",
            model=unet_out,
            b1=model_shifts["b1"],
            b2=model_shifts["b2"],
            s1=model_shifts["s1"],
            s2=model_shifts["s2"]
        )
        unet_out = exit_node.out(0)

    return exit_node, unet_out

# Add model shift nodes, which I'm including FreeU v2 in.
def create_model_shift_nodes(graph, unet_in, model_shifts):
    exit_node = None
    unet_out = unet_in
    if model_shifts is None:
        logging.info("No model shifts to apply.")
        return exit_node, unet_out

    exit_node, unet_out = create_shift_node(graph, unet_out, model_shifts)
    exit_node, unet_out = create_freeu_v2_node(graph, unet_out, model_shifts)
    return exit_node, unet_out

# Add lora nodes as well as model shift nodes.
def create_lora_shift_nodes(graph: GraphBuilder, unet_in, clip_in=None, lora_stack=None, model_shifts=None):
    exit_node, exit_unet, exit_clip = create_lora_nodes(graph, unet_in, clip_in, lora_stack)
    exit_node, exit_unet = create_model_shift_nodes(graph, exit_unet, model_shifts)
    return exit_node, exit_unet, exit_clip

# Add nodes to add to a lora stack.
def add_lora_stack_node(graph: GraphBuilder, args, idx, lora_stack = None):
    lora_enabled = args[f"enabled_{idx}"]
    lora_name = args[f"lora_{idx}_name"]
    model_weight = args[f"model_{idx}_weight"]
    # If clip weight is not provided, it defaults to 1.0
    clip_weight = args.get(f"clip_{idx}_weight", 1.0)
    logging.info(f"Creating Lora stack node: {lora_name}, enabled: {lora_enabled}, model_weight: {model_weight}, clip_weight: {clip_weight}")

    return graph.node("Sage_LoraStack",
            enabled = lora_enabled,
            lora_name = lora_name,
            model_weight = model_weight,
            clip_weight = clip_weight,
            lora_stack = lora_stack
        )
