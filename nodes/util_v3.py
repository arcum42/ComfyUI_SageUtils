# Util nodes v3
# Misc utility and model-info helpers migrated from v1.

from __future__ import annotations
from comfy.comfy_types.node_typing import ComfyNodeABC, InputTypeDict, IO
from comfy_api.latest import io
from comfy_execution.graph import ExecutionBlocker

import comfy.model_management as mm
from ..utils import (
    cache, blank_image, url_to_torch_image,
    get_latest_model_version, get_lora_hash, pull_metadata,
    get_civitai_model_version_json_by_hash, pull_lora_image_urls,
    model_scan, str_to_bool, get_lora_stack_keywords
)
from ..utils import model_info as mi
import folder_paths
import hashlib
import gc
import json
import logging
import pathlib

from .custom_io_v3 import *


# NOTE: These nodes mirror v1 behavior; UI-rich outputs use markdown text in ui payloads.

# ============================================================================
# PLACEHOLDER NODES - NOT YET FULLY IMPLEMENTED
# ============================================================================
# These are placeholder implementations. The inputs/outputs match the original
# v1 nodes, but the execute methods need proper implementation.

class Sage_FreeMemory(io.ComfyNode):
    """Free up memory by unloading all models and clearing caches."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_FreeMemory",
            display_name="Free Memory",
            description="Unload models, run garbage collection, and empty caches when enabled.",
            category="Sage Utils/util",
            inputs=[
                io.Boolean.Input("free_memory", default=False),
                io.AnyType.Input("value")
            ],
            outputs=[
                io.AnyType.Output("out_value", display_name="value")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        value = kwargs.get("value", None)
        free_memory = kwargs.get("free_memory", False)
        if free_memory:
            mm.unload_all_models()
            gc.collect()
            mm.soft_empty_cache()
        return io.NodeOutput(value)

class Sage_Halt(io.ComfyNode):
    """Continue or halt the workflow from this point."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_Halt",
            display_name="Halt",
            description="Return the value when continuing; otherwise halt execution.",
            category="Sage Utils/util",
            inputs=[
                io.Boolean.Input("continue_executing", default=True),
                io.AnyType.Input("value", lazy=True, optional=True)
            ],
            outputs=[
                io.AnyType.Output("out_value", display_name="value")
            ]
        )
    
    @classmethod
    def check_lazy_status(cls, continue_executing, value=...):
        # Skip evaluating the value when halting execution
        if not continue_executing:
            return []
        return ["value"]

    @classmethod
    def execute(cls, **kwargs):
        value = kwargs.get("value", None)
        cont = kwargs.get("continue_executing", True)
        if cont:
            return io.NodeOutput(value)
        return ExecutionBlocker(None)

class Sage_LogicalSwitch(io.ComfyNode):
    """Return one of two values based on a condition."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_LogicalSwitch",
            display_name="Logical Switch",
            description="Select between two inputs based on the condition; only the needed branch is evaluated when lazy.",
            category="Sage Utils/util",
            inputs=[
                io.Boolean.Input("condition", default=True),
                io.AnyType.Input("true_value", lazy=True, optional=True),
                io.AnyType.Input("false_value", lazy=True, optional=True)
            ],
            outputs=[
                io.AnyType.Output("result")
            ]
        )
    
    @classmethod
    def validate_inputs(cls, **kwargs):
        true_value = kwargs.get("true_value", ...)
        false_value = kwargs.get("false_value", ...)
        if true_value is ... and false_value is ...:
            return "At least one of true_value or false_value must be connected."
        return True

    @classmethod
    def check_lazy_status(cls, **kwargs):
        condition = kwargs.get("condition", True)
        true_value = kwargs.get("true_value", ...)
        false_value = kwargs.get("false_value", ...)

        # Request evaluation only for the branch that will be used
        if condition:
            if true_value is ...:
                return ["false_value"]
            return ["true_value"]
        if false_value is ...:
            return ["true_value"]
        return ["false_value"]

    @classmethod
    def execute(cls, **kwargs):
        condition = kwargs.get("condition", True)
        true_value = kwargs.get("true_value", ...)
        false_value = kwargs.get("false_value", ...)

        if true_value is ...:
            return io.NodeOutput(false_value)
        if false_value is ...:
            return io.NodeOutput(true_value)

        return io.NodeOutput(true_value if condition else false_value)

class Sage_ModelInfo(io.ComfyNode):
    """Pull Civitai model info for the last model in stack."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_ModelInfo",
            display_name="Model Info",
            description="PLACEHOLDER: Pull the civitai model info, and return what the base model is, the name with version, the url, the url for the latest version, and a preview image.",
            category="Sage Utils/model/info",
            inputs=[
                ModelInfo.Input("model_info")
            ],
            outputs=[
                io.String.Output("base_model"),
                io.String.Output("name"),
                io.String.Output("url"),
                io.String.Output("latest_url"),
                io.Image.Output("image")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        model_info = kwargs.get("model_info")
        info = mi.get_model_info_component(model_info, "CKPT") if model_info is not None else None

        if not info:
            return io.NodeOutput("", "", "", "", None)

        image = blank_image()
        try:
            json_data = get_civitai_model_version_json_by_hash(info["hash"])
            if "modelId" in json_data:
                url = f"https://civitai.com/models/{json_data['modelId']}?modelVersionId={json_data['id']}"
                latest_version = get_latest_model_version(json_data["modelId"]) or json_data["id"]
                latest_url = f"https://civitai.com/models/{json_data['modelId']}?modelVersionId={latest_version}"
                image_urls = pull_lora_image_urls(info.get("hash"), True)
                if image_urls:
                    image = url_to_torch_image(image_urls[0])
            else:
                url = ""
                latest_url = ""

            model_data = json_data.get("model", {}) if isinstance(json_data, dict) else {}
            model_name = model_data.get("name", "") if isinstance(model_data, dict) else ""

            return io.NodeOutput(
                json_data.get("baseModel", ""),
                f"{model_name} {json_data.get('name', '')}",
                url,
                latest_url,
                image
            )
        except Exception:
            logging.error("Exception when getting model info json data.")
            return io.NodeOutput("", "", "", "", image)

class Sage_ModelInfoDisplay(io.ComfyNode):
    """Display model info as markdown with Civitai details."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_ModelInfoDisplay",
            display_name="Model Info Display",
            description="PLACEHOLDER: Display model information in a formatted markdown block with civitai details, base model, name, version, and links.",
            category="Sage Utils/model/info",
            is_output_node=True,
            inputs=[
                ModelInfo.Input("model_info")
            ],
            outputs=[
                io.String.Output("markdown_display")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        model_info = kwargs.get("model_info")
        info = mi.get_model_info_component(model_info, "CKPT") if model_info is not None else None

        if not info:
            content = "# Model Information\n\n**No model information available.**"
            return io.NodeOutput(content, ui={"text": content})

        try:
            json_data = get_civitai_model_version_json_by_hash(info["hash"])
            if "modelId" in json_data:
                model_data = json_data.get("model", {}) if isinstance(json_data, dict) else {}
                model_name = model_data.get("name", "Unknown Model") if isinstance(model_data, dict) else "Unknown Model"
                version_name = json_data.get("name", "Unknown Version")
                base_model = json_data.get("baseModel", "Unknown")
                model_id = json_data.get("modelId", "")
                version_id = json_data.get("id", "")
                description = json_data.get("description", "No description available.")

                current_url = f"https://civitai.com/models/{model_id}?modelVersionId={version_id}"
                latest_version = get_latest_model_version(model_id) or version_id
                latest_url = f"https://civitai.com/models/{model_id}?modelVersionId={latest_version}"

                download_count = "Unknown"
                rating = "Unknown"
                tags = []
                if isinstance(model_data, dict):
                    download_count = model_data.get("downloadCount", "Unknown")
                    stats_data = model_data.get("stats", {}) if isinstance(model_data.get("stats", {}), dict) else {}
                    rating = stats_data.get("rating", "Unknown") if isinstance(stats_data, dict) else "Unknown"
                    tags = model_data.get("tags", []) if isinstance(model_data.get("tags", []), list) else []

                links_section = f"- [**Current Version**]({current_url})"
                if latest_url != current_url:
                    links_section += f"\n- [**Latest Version**]({latest_url})"

                image_section = ""
                try:
                    image_urls = pull_lora_image_urls(info["hash"], False)
                    if image_urls:
                        image_section = f"\n### Preview\n![Model Preview]({image_urls[0]})\n"
                except Exception:
                    pass

                markdown = f"""# {model_name}

## Version: {version_name}
{image_section}
### Basic Information
- **Base Model**: {base_model}
- **Model Hash**: `{info.get('hash', 'Unknown')[:12]}...`
- **Downloads**: {download_count}
- **Rating**: {rating}

### Description
{description}

### Links
{links_section}

### Tags
{', '.join([f'`{tag}`' for tag in tags[:10]]) if tags else 'No tags available'}

---
*Information retrieved from Civitai*"""

                return io.NodeOutput(markdown, ui={"text": markdown})

            markdown = f"""# Model Information

### Basic Information
- **Model Hash**: `{info.get('hash', 'Unknown')[:12]}...`
- **File Path**: `{info.get('filename', 'Unknown')}`

### Status
**No Civitai information available for this model.**

This model may be:
- A custom or private model
- Not uploaded to Civitai
- Using a different hash than expected

---
*Local model information only*"""
            return io.NodeOutput(markdown, ui={"text": markdown})
        except Exception as e:
            error_markdown = f"""# Model Information Error

### Basic Information
- **Model Hash**: `{info.get('hash', 'Unknown')[:12]}...`

### Error
Failed to retrieve model information from Civitai.

**Error details**: {str(e)}

### Troubleshooting
- Check internet connection
- Verify the model exists on Civitai
- Try refreshing the cache

---
*Error occurred while fetching data*"""
            return io.NodeOutput(error_markdown, ui={"text": error_markdown})

class Sage_LoraStackInfoDisplay(io.ComfyNode):
    """Display information for all LoRAs in a lora_stack."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_LoraStackInfoDisplay",
            display_name="LoRA Stack Info Display",
            description="PLACEHOLDER: Display information for all LoRAs in a lora_stack as formatted markdown with civitai details, weights, and links.",
            category="Sage Utils/model/info",
            is_output_node=True,
            inputs=[
                LoraStack.Input("lora_stack")
            ],
            outputs=[
                io.String.Output("markdown_display")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        lora_stack = kwargs.get("lora_stack")
        if not lora_stack:
            content = "# LoRA Stack Information\n\n**No LoRAs in stack.**"
            return io.NodeOutput(content, ui={"text": content})

        lora_sections = []
        for i, lora in enumerate(lora_stack, 1):
            lora_name = lora[0]
            model_weight = lora[1]
            clip_weight = lora[2]
            try:
                hash_value = get_lora_hash(lora_name)
                json_data = get_civitai_model_version_json_by_hash(hash_value)
                if "modelId" in json_data:
                    model_data = json_data.get("model", {}) if isinstance(json_data, dict) else {}
                    model_name = model_data.get("name", "Unknown Model") if isinstance(model_data, dict) else "Unknown Model"
                    version_name = json_data.get("name", "Unknown Version")
                    base_model = json_data.get("baseModel", "Unknown")
                    model_id = json_data.get("modelId", "")
                    version_id = json_data.get("id", "")
                    description = json_data.get("description", "No description available.")

                    current_url = f"https://civitai.com/models/{model_id}?modelVersionId={version_id}"
                    latest_version = get_latest_model_version(model_id) or version_id
                    latest_url = f"https://civitai.com/models/{model_id}?modelVersionId={latest_version}"

                    download_count = "Unknown"
                    rating = "Unknown"
                    tags = []
                    if isinstance(model_data, dict):
                        download_count = model_data.get("downloadCount", "Unknown")
                        stats_data = model_data.get("stats", {}) if isinstance(model_data.get("stats", {}), dict) else {}
                        rating = stats_data.get("rating", "Unknown") if isinstance(stats_data, dict) else "Unknown"
                        tags = model_data.get("tags", []) if isinstance(model_data.get("tags", []), list) else []

                    links_section = f"- [**Current Version**]({current_url})"
                    if latest_url != current_url:
                        links_section += f"\n- [**Latest Version**]({latest_url})"

                    image_section = ""
                    try:
                        image_urls = pull_lora_image_urls(hash_value, False)
                        if image_urls:
                            image_section = f"\n#### Preview\n![LoRA Preview]({image_urls[0]})\n"
                    except Exception:
                        pass

                    lora_section = f"""## {i}. {model_name}

### Version: {version_name}
{image_section}
#### Basic Information
- **Base Model**: {base_model}
- **Model Weight**: {model_weight}
- **CLIP Weight**: {clip_weight}
- **File**: `{lora_name}`
- **Hash**: `{hash_value[:12]}...`
- **Downloads**: {download_count}
- **Rating**: {rating}

#### Description
{description}

#### Links
{links_section}

#### Tags
{', '.join([f'`{tag}`' for tag in tags[:10]]) if tags else 'No tags available'}

---"""
                    lora_sections.append(lora_section)
                else:
                    lora_section = f"""## {i}. {lora_name}

#### Basic Information
- **Model Weight**: {model_weight}
- **CLIP Weight**: {clip_weight}
- **File**: `{lora_name}`
- **Hash**: `{hash_value[:12]}...`

#### Status
**No Civitai information available for this LoRA.**

This LoRA may be:
- A custom or private LoRA
- Not uploaded to Civitai
- Using a different hash than expected

---"""
                    lora_sections.append(lora_section)
            except Exception as e:
                error_section = f"""## {i}. {lora_name}

#### Basic Information
- **Model Weight**: {model_weight}
- **CLIP Weight**: {clip_weight}
- **File**: `{lora_name}`

#### Error
Failed to retrieve LoRA information from Civitai.

**Error details**: {str(e)}

---"""
                lora_sections.append(error_section)

        total_loras = len(lora_stack)
        markdown = f"""# LoRA Stack Information

**Total LoRAs**: {total_loras}

{chr(10).join(lora_sections)}

*Information retrieved from Civitai*"""
        return io.NodeOutput(markdown, ui={"text": markdown})

class Sage_LastLoraInfo(io.ComfyNode):
    """Pull Civitai info for the last LoRA in the stack."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_LastLoraInfo",
            display_name="Last LoRA Info",
            description="PLACEHOLDER: Pull civitai info for the last lora in the stack and return details.",
            category="Sage Utils/model/info",
            inputs=
            [LoraStack.Input("lora_stack")
            ],
            outputs=[
                io.String.Output("base_model"),
                io.String.Output("name"),
                io.String.Output("url"),
                io.String.Output("latest_url"),
                io.Image.Output("image")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        lora_stack = kwargs.get("lora_stack")
        if lora_stack is None:
            return io.NodeOutput("", "", "", "", None)

        last_lora = lora_stack[-1]
        image = blank_image()
        try:
            hash_value = get_lora_hash(last_lora[0])
            json_data = get_civitai_model_version_json_by_hash(hash_value)
            if "modelId" in json_data:
                url = f"https://civitai.com/models/{json_data['modelId']}?modelVersionId={json_data['id']}"
                latest_version = get_latest_model_version(json_data["modelId"]) or json_data["id"]
                latest_url = f"https://civitai.com/models/{json_data['modelId']}?modelVersionId={latest_version}"
                image_urls = pull_lora_image_urls(hash_value, True)
                if image_urls:
                    image = url_to_torch_image(image_urls[0])
            else:
                url = ""
                latest_url = ""

            model_data = json_data.get("model", {}) if isinstance(json_data, dict) else {}
            model_name = model_data.get("name", "") if isinstance(model_data, dict) else ""

            return io.NodeOutput(
                json_data.get("baseModel", ""),
                f"{model_name} {json_data.get('name', '')}",
                url,
                latest_url,
                image
            )
        except Exception:
            logging.error("Exception when getting lora info json data.")
            return io.NodeOutput("", "", "", "", image)

class Sage_GetFileHash(io.ComfyNode):
    """Get an sha256 hash of a file."""
    @classmethod
    def define_schema(cls):
        folder_list = list(folder_paths.folder_names_and_paths.keys())
        return io.Schema(
            node_id="Sage_GetFileHash",
            display_name="Get File Hash",
            description="Get the hash of a file in the configured model paths.",
            category="Sage Utils/util",
            inputs=[
                io.Combo.Input("base_dir", options=folder_list, default=folder_list[0] if folder_list else ""),
                io.String.Input("filename")
            ],
            outputs=[
                io.String.Output("hash")
            ]
        )
    
    @classmethod
    def validate_inputs(cls, **kwargs):
        base_dir = kwargs.get("base_dir", "")
        filename = kwargs.get("filename", "")
        try:
            file_path = pathlib.Path(folder_paths.get_full_path_or_raise(base_dir, filename))
        except Exception:
            return f"File '{filename}' not found in base directory '{base_dir}'."

        if not file_path.is_file():
            return f"'{file_path}' is not a file."

        return True

    @classmethod
    def fingerprint_inputs(cls, **kwargs):
        base_dir = kwargs.get("base_dir", "")
        filename = kwargs.get("filename", "")
        try:
            file_path = pathlib.Path(folder_paths.get_full_path_or_raise(base_dir, filename))
            stat = file_path.stat()
        except Exception:
            return None

        m = hashlib.sha256()
        m.update(str(file_path).encode())
        m.update(str(stat.st_size).encode())
        m.update(str(stat.st_mtime_ns).encode())
        return m.digest().hex()

    @classmethod
    def execute(cls, **kwargs):
        base_dir = kwargs.get("base_dir")
        filename = kwargs.get("filename")
        the_hash = ""
        try:
            file_path = folder_paths.get_full_path_or_raise(base_dir, filename)
            pull_metadata(file_path)
            the_hash = cache.hash.get(file_path, "")
        except Exception:
            logging.error(f"Unable to hash file '{filename}'.")
            the_hash = ""
        return io.NodeOutput(str(the_hash))

class Sage_CacheMaintenance(io.ComfyNode):
    """Remove ghost entries and report dupes / missing Civitai entries."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_CacheMaintenance",
            display_name="Cache Maintenance",
            description="PLACEHOLDER: Perform cache maintenance operations like clearing or updating the cache.",
            category="Sage Utils/util",
            is_output_node=True,
            inputs=[
                io.Boolean.Input("remove_ghost_entries", default=False)
            ],
            outputs=[
                io.String.Output("ghost_entries"),
                io.String.Output("dup_hash"),
                io.String.Output("dup_model"),
                io.String.Output("not_on_civitai")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        remove_ghost_entries = kwargs.get("remove_ghost_entries", False)
        ghost_entries = []
        for key in list(cache.hash.keys()):
            if not pathlib.Path(key).is_file():
                ghost_entries.append(key)

        cache_by_hash = {}
        cache_by_id = {}
        for model_path, model_hash in cache.hash.items():
            cache_by_hash.setdefault(model_hash, []).append(model_path)
            info = cache.by_path(model_path)
            model_id = info.get("modelId", None)
            if model_id:
                cache_by_id.setdefault(model_id, []).append(model_path)

        if remove_ghost_entries:
            for ghost in ghost_entries:
                cache.hash.pop(ghost, None)
            cache.save()

        dup_hash = {h: paths for h, paths in cache_by_hash.items() if len(paths) > 1}
        dup_id = {i: paths for i, paths in cache_by_id.items() if len(paths) > 1}

        dup_hash_json = json.dumps(dup_hash, separators=(",", ":"), sort_keys=True, indent=4)
        dup_id_json = json.dumps(dup_id, separators=(",", ":"), sort_keys=True, indent=4)

        not_on_civitai = []
        for model_path, _ in cache.hash.items():
            model_info = cache.by_path(model_path)
            in_civitai = False
            try:
                in_civitai = str_to_bool(model_info.get("civitai"))
            except Exception:
                in_civitai = False
            if in_civitai is not True:
                not_on_civitai.append(model_path)

        not_on_civitai_str = str(not_on_civitai)
        return io.NodeOutput(", ".join(ghost_entries), dup_hash_json, dup_id_json, not_on_civitai_str)

class Sage_ModelReport(io.ComfyNode):
    """Scan models/loras and emit lists grouped by base model."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_ModelReport",
            display_name="Model Report",
            description="PLACEHOLDER: Generate a report of all models with their information.",
            category="Sage Utils/model/info",
            is_output_node=True,
            inputs=[
                io.Combo.Input("scan_models", options=["none", "loras", "checkpoints", "all"], default="none"),
                io.Boolean.Input("force_recheck", default=False)
            ],
            outputs=[
                io.String.Output("model_list"),
                io.String.Output("lora_list")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        scan_models = kwargs.get("scan_models", "none")
        force_recheck = kwargs.get("force_recheck", False)

        def get_files(kind, force):
            paths = []
            if kind == "loras":
                paths = folder_paths.get_folder_paths("loras")
            elif kind == "checkpoints":
                paths = folder_paths.get_folder_paths("checkpoints")
            elif kind == "all":
                paths = [*folder_paths.get_folder_paths("loras"), *folder_paths.get_folder_paths("checkpoints")]
            if paths:
                model_scan(paths, force=force)

        get_files(scan_models, force_recheck)

        sorted_models = {}
        sorted_loras = {}
        for model_path, model_hash in cache.hash.items():
            cur = cache.info.get(model_hash, {})
            base_model = cur.get("baseModel", None)
            model_type = cur.get("model", {}).get("type", None)
            if model_type == "Checkpoint":
                sorted_models.setdefault(base_model, []).append(str(model_path))
            if model_type == "LORA":
                sorted_loras.setdefault(base_model, []).append(str(model_path))

        model_list = json.dumps(sorted_models, separators=(",", ":"), sort_keys=True, indent=4) if sorted_models else ""
        lora_list = json.dumps(sorted_loras, separators=(",", ":"), sort_keys=True, indent=4) if sorted_loras else ""
        return io.NodeOutput(model_list, lora_list)

class Sage_MultiModelPicker(io.ComfyNode):
    """Pick a model_info entry by index from a provided list."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_MultiModelPicker",
            display_name="Multi Model Picker",
            description="Select one model_info from a list by index.",
            category="Sage Utils/model",
            inputs=[
                io.Int.Input("index", default=1, min=1, max=100, step=1, tooltip="1-based index into provided model list"),
                io.AnyType.Input("models")
            ],
            outputs=[
                ModelInfo.Output("model_info")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        index = kwargs.get("index", 1)
        models = kwargs.get("models")
        if models is None:
            raise ValueError("No models provided to Multi Model Picker.")
        model_list = list(models) if not isinstance(models, dict) else list(models.values())
        if index < 1 or index > len(model_list):
            raise ValueError("Index out of range. Please select a valid model index.")
        selected = model_list[index - 1]
        return io.NodeOutput(selected)

class Sage_CollectKeywordsFromLoraStack(io.ComfyNode):
    """Collect keywords from all LoRAs in a stack."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_CollectKeywordsFromLoraStack",
            display_name="Collect Keywords From LoRA Stack",
            description="PLACEHOLDER: Collect keywords from all LoRAs in a stack.",
            category="Sage Utils/lora",
            inputs=[
                LoraStack.Input("lora_stack")
            ],
            outputs=[
                io.String.Output("keywords")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        lora_stack = kwargs.get("lora_stack")
        if lora_stack is None:
            return io.NodeOutput("")
        return io.NodeOutput(get_lora_stack_keywords(lora_stack))

class Sage_CheckLorasForUpdates(io.ComfyNode):
    """Check LoRAs in the stack for updates on Civitai."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_CheckLorasForUpdates",
            display_name="Check LoRAs For Updates",
            description="PLACEHOLDER: Check if LoRAs in the stack have updates available on Civitai.",
            category="Sage Utils/lora",
            is_output_node=True,
            inputs=[
                LoraStack.Input("lora_stack"),
                io.Boolean.Input("force", default=False, tooltip="Force a check even if marked up to date.")
            ],
            outputs=[
                LoraStack.Output("out_lora_stack"),
                io.String.Output("path"),
                io.String.Output("latest_url")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        lora_stack = kwargs.get("lora_stack")
        force = kwargs.get("force", False)
        if lora_stack is None:
            return io.NodeOutput(None, "", "")

        lora_list = []
        lora_url_list = []

        for lora in lora_stack:
            if lora is not None:
                logging.info(f"Checking {lora[0]} for updates...")
                lora_path = folder_paths.get_full_path_or_raise("loras", lora[0])
                pull_metadata(lora_path, force_all=force)
                logging.info(f"Update check complete for {lora[0]}")

                info = cache.by_path(lora_path)
                if info.get("update_available"):
                    model_id = info.get("modelId")
                    latest_version = get_latest_model_version(model_id) if model_id else None
                    latest_url = f"https://civitai.com/models/{model_id}?modelVersionId={latest_version}" if latest_version else ""
                    if latest_url:
                        logging.info(f"Update found for {lora[0]}")
                        lora_url_list.append(latest_url)
                        lora_list.append(lora_path)

        return io.NodeOutput(lora_stack, str(lora_list), str(lora_url_list))

# ============================================================================

UTIL_NODES = [
    Sage_FreeMemory,
    Sage_Halt,
    Sage_LogicalSwitch,
    Sage_ModelInfo,
    Sage_ModelInfoDisplay,
    Sage_LoraStackInfoDisplay,
    Sage_LastLoraInfo,
    Sage_GetFileHash,
    Sage_CacheMaintenance,
    Sage_ModelReport,
    Sage_MultiModelPicker,
    Sage_CollectKeywordsFromLoraStack,
    Sage_CheckLorasForUpdates
]
