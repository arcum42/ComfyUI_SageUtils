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
                io.Boolean.Input("free_memory", display_name="free_memory", default=False),
                io.AnyType.Input("value", display_name="value")
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
                io.Boolean.Input("continue_executing", display_name="continue_executing", default=True),
                io.AnyType.Input("value", display_name="value", lazy=True, optional=True)
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
            is_deprecated=True,
            inputs=[
                io.Boolean.Input("condition", display_name="condition", default=True),
                io.AnyType.Input("true_value", display_name="true_value", lazy=True, optional=True),
                io.AnyType.Input("false_value", display_name="false_value", lazy=True, optional=True)
            ],
            outputs=[
                io.AnyType.Output("result", display_name="result")
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
            description="Pull the civitai model info, and return what the base model is, the name with version, the url, the url for the latest version, and a preview image.",
            category="Sage Utils/model/info",
            inputs=[
                ModelInfo.Input("model_info", display_name="model_info")
            ],
            outputs=[
                io.String.Output("base_model", display_name="base_model"),
                io.String.Output("name", display_name="name"),
                io.String.Output("url", display_name="url"),
                io.String.Output("latest_url", display_name="latest_url"),
                io.Image.Output("image", display_name="image")
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
            description="Display model information in a formatted markdown block with civitai details, base model, name, version, and links.",
            category="Sage Utils/model/info",
            is_output_node=True,
            inputs=[
                ModelInfo.Input("model_info", display_name="model_info")
            ],
            outputs=[
                io.String.Output("markdown_display", display_name="markdown_display")
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
            description="Display information for all LoRAs in a lora_stack as formatted markdown with civitai details, weights, and links.",
            category="Sage Utils/model/info",
            is_output_node=True,
            inputs=[
                LoraStack.Input("lora_stack", display_name="lora_stack")
            ],
            outputs=[
                io.String.Output("markdown_display", display_name="markdown_display")
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
                io.Int.Input("index", display_name="index", default=1, min=1, max=100, step=1, tooltip="1-based index into provided model list")
            ],
            outputs=[
                ModelInfo.Output("model_info", display_name="model_info")
            ]
        )
    
    @classmethod
    def execute(cls, **kw):
        model_infos = kw.values()
        index = kw.get("index", 1)
        model_infos = list(model_infos)
        if index < 1 or index > len(model_infos):
            raise ValueError("Index out of range. Please select a valid model index.")
        selected_model_info = model_infos[index]
    
        return io.NodeOutput(selected_model_info)

class Sage_CollectKeywordsFromLoraStack(io.ComfyNode):
    """Collect keywords from all LoRAs in a stack."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_CollectKeywordsFromLoraStack",
            display_name="Collect Keywords From LoRA Stack",
            description="Collect keywords from all LoRAs in a stack.",
            category="Sage Utils/lora",
            inputs=[
                LoraStack.Input("lora_stack", display_name="lora_stack")
            ],
            outputs=[
                io.String.Output("keywords", display_name="keywords")
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
            description="Check if LoRAs in the stack have updates available on Civitai.",
            category="Sage Utils/lora",
            is_output_node=True,
            inputs=[
                LoraStack.Input("lora_stack", display_name="lora_stack"),
                io.Boolean.Input("force", display_name="force", default=False, tooltip="Force a check even if marked up to date.")
            ],
            outputs=[
                LoraStack.Output("out_lora_stack", display_name="lora_stack"),
                io.String.Output("path", display_name="path"),
                io.String.Output("latest_url", display_name="latest_url")
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
    Sage_MultiModelPicker,
    Sage_CollectKeywordsFromLoraStack,
    Sage_CheckLorasForUpdates
]
