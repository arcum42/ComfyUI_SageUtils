from comfy_execution.graph_utils import GraphBuilder
from comfy.utils import ProgressBar
from .helpers import (
    get_path_without_base,
    get_file_extension
    )


def add_ckpt_node_from_info(graph: GraphBuilder, ckpt_info):
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

def add_unet_node_from_info(graph: GraphBuilder, unet_info):
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

def add_clip_node_from_info(graph: GraphBuilder, clip_info):
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

def add_vae_node_from_info(graph: GraphBuilder, vae_info):
    vae_node = None
    if vae_info is not None:
        vae_name = vae_info["path"]
        vae_fixed_name = get_path_without_base("vae", vae_name)
        # There is no GGUF for VAE currently, so we can just use VAELoader.
        print(f"Added node VAELoader with vae_name: {vae_fixed_name}")
        vae_node = graph.node("VAELoader", vae_name=vae_fixed_name)
    return vae_node



def create_lora_nodes(graph: GraphBuilder, model_in, clip_in, lora_stack):
    lora_node = None
    print(f"Creating Lora nodes with lora_stack: {lora_stack}")
    for lora in lora_stack:
        lora_node = graph.node("LoraLoader", model=model_in, clip=clip_in, lora_name=lora[0], strength_model=lora[1], strength_clip=lora[2])
        model_in = lora_node.out(0)
        clip_in = lora_node.out(1)
    return lora_node

def create_lora_nodes_v2(graph: GraphBuilder, unet_in, clip_in, lora_stack=None):
    unet_out = unet_in
    clip_out = clip_in
    print(f"Creating Lora nodes with lora_stack: {lora_stack}")

    if lora_stack is None:
        return unet_out, clip_out

    for lora in lora_stack:
        lora_node = graph.node("LoraLoader", model=unet_in, clip=clip_in, lora_name=lora[0], strength_model=lora[1], strength_clip=lora[2])
        unet_out = lora_node.out(0)
        clip_out = lora_node.out(1)
    return unet_out, clip_out

def create_lora_nodes_model_only(graph: GraphBuilder, model_in, lora_stack):
    lora_node = None
    print(f"Creating Lora nodes with lora_stack: {lora_stack}")
    for lora in lora_stack:
        lora_node = graph.node("LoraLoaderModelOnly", model=model_in, lora_name=lora[0], strength_model=lora[1])
        model_in = lora_node.out(0)
    return lora_node

def create_model_shift_nodes(graph: GraphBuilder, lora_node, model, model_shifts):
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

def create_model_shift_nodes_v2(graph, unet_in, model_shifts):
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

def add_lora_stack_node(graph: GraphBuilder, args, idx, lora_stack = None):
    lora_enabled = args[f"enabled_{idx}"]
    lora_name = args[f"lora_{idx}_name"]
    model_weight = args[f"model_{idx}_weight"]
    # If clip weight is not provided, it defaults to 1.0
    clip_weight = args.get(f"clip_{idx}_weight", 1.0)
    print(f"Creating Lora stack node: {lora_name}, enabled: {lora_enabled}, model_weight: {model_weight}, clip_weight: {clip_weight}")

    return graph.node("Sage_LoraStack",
            enabled = lora_enabled,
            lora_name = lora_name,
            model_weight = model_weight,
            clip_weight = clip_weight,
            lora_stack = lora_stack
        )
