# Utility nodes
# This is for any misc utility nodes that don't fit into the other categories.

from __future__ import annotations
from comfy.comfy_types.node_typing import ComfyNodeABC, InputTypeDict, IO

import folder_paths
from comfy_execution.graph import ExecutionBlocker

# Import specific utilities instead of wildcard import
from ..utils import (
    cache, blank_image, url_to_torch_image,
    get_latest_model_version, get_lora_hash, pull_metadata,
    get_civitai_model_version_json_by_hash, pull_lora_image_urls
)

import comfy.model_management as mm
import gc

from ..utils import model_info as mi
class Sage_FreeMemory(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "free_memory": (IO.BOOLEAN, {"defaultInput": False}),
                "value": (IO.ANY,{"defaultInput": False})
            }
        }

    @classmethod
    def VALIDATE_INPUTS(s, input_types) -> bool:
        return True

    RETURN_TYPES = (IO.ANY,)
    RETURN_NAMES = ("value",)

    FUNCTION = "free_memory"

    CATEGORY = "Sage Utils/util"
    DESCRIPTION = "Free up memory by unloading all models, clearing the model cache, and garbage collecting."

    def free_memory(self, free_memory, value):
        if free_memory:
            mm.unload_all_models()
            gc.collect()
            mm.soft_empty_cache()

        return (value,)
class Sage_Halt(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "continue_executing": (IO.BOOLEAN, {"label_on": "Continue", "label_off": "Halt", "defaultInput": False}),
                "value": (IO.ANY,{"defaultInput": False})
            }
        }

    @classmethod
    def VALIDATE_INPUTS(s, input_types) -> bool:
        return True

    RETURN_TYPES = (IO.ANY,)
    RETURN_NAMES = ("value",)

    FUNCTION = "halt_or_continue"

    CATEGORY = "Sage Utils/util"
    DESCRIPTION = "Continue or Halt the workflow from this point."

    def halt_or_continue(self, continue_executing, value):
        """
        If the condition is True, return the value.
        If the condition is False, halt execution.
        """
        if continue_executing:
            return (value,)
        else:
            return (ExecutionBlocker(None))

class Sage_LogicalSwitch(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "condition": (IO.BOOLEAN, {"defaultInput": False}),
                "true_value": (IO.ANY,{"defaultInput": False}),
                "false_value": (IO.ANY,{"defaultInput": False})
            }
        }

    @classmethod
    def VALIDATE_INPUTS(s, input_types) -> bool:
        return True

    RETURN_TYPES = (IO.ANY,)
    RETURN_NAMES = ("result",)

    FUNCTION = "if_else"

    CATEGORY = "Sage Utils/util"
    DESCRIPTION = "Returns one of two values based on a condition."

    def if_else(self, condition, true_value, false_value) -> tuple:
        return (true_value if condition else false_value,)

class Sage_ModelInfo(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "model_info": ("MODEL_INFO", {"defaultInput": True})
            }
        }

    RETURN_TYPES = (IO.STRING, IO.STRING, IO.STRING, IO.STRING, IO.IMAGE)
    RETURN_NAMES = ("base_model", "name", "url", "latest_url", "image")

    FUNCTION = "get_last_info"

    CATEGORY = "Sage Utils/model"
    DESCRIPTION = "Pull the civitai model info, and return what the base model is, the name with version, the url, the url for the latest version, and a preview image. Note that last model in the stack is not necessarily the one this node is hooked to, since that node may be disabled."

    def get_last_info(self, model_info) -> tuple:
        info = mi.get_model_info_component(model_info, "CKPT")
        if info is None or info == {}:
            return ("", "", "", "", None)

        image = blank_image()
        try:
            json_data = get_civitai_model_version_json_by_hash(info["hash"])
            if "modelId" in json_data:
                url = f"https://civitai.com/models/{json_data['modelId']}?modelVersionId={json_data['id']}"
                latest_version = get_latest_model_version(json_data["modelId"])
                if latest_version is None:
                    latest_version = json_data["id"]
                latest_url = f"https://civitai.com/models/{json_data['modelId']}?modelVersionId={latest_version}"
                image_urls = pull_lora_image_urls(model_info["hash"], True)
                image = url_to_torch_image(image_urls[0])
            else:
                url = ""
                latest_url = ""

            # Safely extract model name
            model_data = json_data.get("model", {})
            model_name = ""
            if isinstance(model_data, dict):
                model_name = model_data.get("name", "")

            return (
                json_data.get("baseModel", ""),
                model_name + " " + json_data.get("name", ""),
                url,
                latest_url,
                image)
        except:
            print("Exception when getting json data.")
            return ("", "", "", "", image)

class Sage_ModelInfoDisplay(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "model_info": ("MODEL_INFO", {"defaultInput": True})
            }
        }

    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ("markdown_display",)

    FUNCTION = "display_model_info"

    CATEGORY = "Sage Utils/model"
    DESCRIPTION = "Display model information in a formatted markdown block with civitai details, base model, name, version, and links."
    OUTPUT_NODE = True

    def display_model_info(self, model_info) -> dict:
        info = mi.get_model_info_component(model_info, "CKPT")
        if info is None or info == {}:
            content = "# Model Information\n\n**No model information available.**"
            return {"ui": {"text": content}, "result": (content,)}

        try:
            json_data = get_civitai_model_version_json_by_hash(info["hash"])
            if "modelId" in json_data:
                # Extract information safely
                model_data = json_data.get("model", {})
                model_name = model_data.get("name", "Unknown Model") if isinstance(model_data, dict) else "Unknown Model"
                version_name = json_data.get("name", "Unknown Version")
                base_model = json_data.get("baseModel", "Unknown")
                model_id = json_data.get("modelId", "")
                version_id = json_data.get("id", "")
                description = json_data.get("description", "No description available.")
                
                # Get URLs
                current_url = f"https://civitai.com/models/{model_id}?modelVersionId={version_id}"
                latest_version = get_latest_model_version(model_id)
                if latest_version is None:
                    latest_version = version_id
                latest_url = f"https://civitai.com/models/{model_id}?modelVersionId={latest_version}"
                
                # Get additional metadata if available (with type checking)
                download_count = "Unknown"
                rating = "Unknown"
                tags = []
                
                if isinstance(model_data, dict):
                    download_count = model_data.get("downloadCount", "Unknown")
                    stats_data = model_data.get("stats", {})
                    if isinstance(stats_data, dict):
                        rating = stats_data.get("rating", "Unknown")
                    tags = model_data.get("tags", [])
                    if not isinstance(tags, list):
                        tags = []
                
                # Build links section based on whether there's an update available
                links_section = f"- [**Current Version**]({current_url})"
                if latest_url != current_url:
                    links_section += f"\n- [**Latest Version**]({latest_url})"
                
                # Try to get a preview image
                image_section = ""
                try:
                    image_urls = pull_lora_image_urls(info["hash"], False)  # Use False for SFW images only
                    if image_urls and len(image_urls) > 0:
                        image_section = f"\n### Preview\n![Model Preview]({image_urls[0]})\n"
                except Exception:
                    # If image retrieval fails, just continue without image
                    pass
                
                # Format the markdown
                markdown = f"""# {model_name}

## Version: {version_name}
{image_section}
### Basic Information
- **Base Model**: {base_model}
- **Model Hash**: `{info.get("hash", "Unknown")[:12]}...`
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
                
                return {"ui": {"text": markdown}, "result": (markdown,)}
            else:
                # No Civitai data available
                markdown = f"""# Model Information

### Basic Information
- **Model Hash**: `{info.get("hash", "Unknown")[:12]}...`
- **File Path**: `{info.get("filename", "Unknown")}`

### Status
**No Civitai information available for this model.**

This model may be:
- A custom or private model
- Not uploaded to Civitai
- Using a different hash than expected

---
*Local model information only*"""
                
                return {"ui": {"text": markdown}, "result": (markdown,)}
                
        except Exception as e:
            # Error getting data
            error_markdown = f"""# Model Information Error

### Basic Information
- **Model Hash**: `{info.get("hash", "Unknown")[:12]}...`

### Error
Failed to retrieve model information from Civitai.

**Error details**: {str(e)}

### Troubleshooting
- Check internet connection
- Verify the model exists on Civitai
- Try refreshing the cache

---
*Error occurred while fetching data*"""
            
            return {"ui": {"text": error_markdown}, "result": (error_markdown,)}

class Sage_LoraStackInfoDisplay(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "lora_stack": ("LORA_STACK", {"defaultInput": True})
            }
        }

    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ("markdown_display",)

    FUNCTION = "display_lora_stack_info"

    CATEGORY = "Sage Utils/lora"
    DESCRIPTION = "Display information for all LoRAs in a lora_stack as formatted markdown with civitai details, weights, and links."
    OUTPUT_NODE = True

    def display_lora_stack_info(self, lora_stack) -> dict:
        if lora_stack is None or len(lora_stack) == 0:
            content = "# LoRA Stack Information\n\n**No LoRAs in stack.**"
            return {"ui": {"text": content}, "result": (content,)}

        # Build markdown for all LoRAs in the stack
        lora_sections = []
        
        for i, lora in enumerate(lora_stack, 1):
            lora_name = lora[0]
            model_weight = lora[1]
            clip_weight = lora[2]
            
            try:
                hash_value = get_lora_hash(lora_name)
                json_data = get_civitai_model_version_json_by_hash(hash_value)
                
                if "modelId" in json_data:
                    # Extract information safely
                    model_data = json_data.get("model", {})
                    model_name = model_data.get("name", "Unknown Model") if isinstance(model_data, dict) else "Unknown Model"
                    version_name = json_data.get("name", "Unknown Version")
                    base_model = json_data.get("baseModel", "Unknown")
                    model_id = json_data.get("modelId", "")
                    version_id = json_data.get("id", "")
                    description = json_data.get("description", "No description available.")
                    
                    # Get URLs
                    current_url = f"https://civitai.com/models/{model_id}?modelVersionId={version_id}"
                    latest_version = get_latest_model_version(model_id)
                    if latest_version is None:
                        latest_version = version_id
                    latest_url = f"https://civitai.com/models/{model_id}?modelVersionId={latest_version}"
                    
                    # Get additional metadata if available (with type checking)
                    download_count = "Unknown"
                    rating = "Unknown"
                    tags = []
                    
                    if isinstance(model_data, dict):
                        download_count = model_data.get("downloadCount", "Unknown")
                        stats_data = model_data.get("stats", {})
                        if isinstance(stats_data, dict):
                            rating = stats_data.get("rating", "Unknown")
                        tags = model_data.get("tags", [])
                        if not isinstance(tags, list):
                            tags = []
                    
                    # Build links section based on whether there's an update available
                    links_section = f"- [**Current Version**]({current_url})"
                    if latest_url != current_url:
                        links_section += f"\n- [**Latest Version**]({latest_url})"
                    
                    # Try to get a preview image
                    image_section = ""
                    try:
                        image_urls = pull_lora_image_urls(hash_value, False)  # Use False for SFW images only
                        if image_urls and len(image_urls) > 0:
                            image_section = f"\n#### Preview\n![LoRA Preview]({image_urls[0]})\n"
                    except Exception:
                        # If image retrieval fails, just continue without image
                        pass
                    
                    # Format the LoRA section
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
                    # No Civitai data available for this LoRA
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
                # Error getting data for this LoRA
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
        
        # Combine all sections
        total_loras = len(lora_stack)
        markdown = f"""# LoRA Stack Information

**Total LoRAs**: {total_loras}

{chr(10).join(lora_sections)}

*Information retrieved from Civitai*"""
        
        return {"ui": {"text": markdown}, "result": (markdown,)}

class Sage_LastLoraInfo(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "lora_stack": ("LORA_STACK", {"defaultInput": True})
            }
        }

    RETURN_TYPES = (IO.STRING, IO.STRING, IO.STRING, IO.STRING, IO.IMAGE)
    RETURN_NAMES = ("base_model", "name", "url", "latest_url", "image")

    FUNCTION = "get_last_info"

    CATEGORY = "Sage Utils/lora"
    DESCRIPTION = "Take the last lora in the stack, pull the civitai model info, and return what the base model is, the name with version, the url, the url for the latest version, and a preview image. Note that last model in the stack is not necessarily the one this node is hooked to, since that node may be disabled."

    def get_last_info(self, lora_stack) -> tuple:
        if lora_stack is None:
            return ("", "", "", "", None)

        last_lora = lora_stack[-1]
        image = blank_image()
        try:
            hash = get_lora_hash(last_lora[0])
            json_data = get_civitai_model_version_json_by_hash(hash)
            if "modelId" in json_data:
                url = f"https://civitai.com/models/{json_data['modelId']}?modelVersionId={json_data['id']}"
                latest_version = get_latest_model_version(json_data["modelId"])
                if latest_version is None:
                    latest_version = json_data["id"]
                latest_url = f"https://civitai.com/models/{json_data['modelId']}?modelVersionId={latest_version}"
                image_urls = pull_lora_image_urls(hash, True)
                image = url_to_torch_image(image_urls[0])
            else:
                url = ""
                latest_url = ""

            # Safely extract model name  
            model_data = json_data.get("model", {})
            model_name = ""
            if isinstance(model_data, dict):
                model_name = model_data.get("name", "")

            return (
                json_data.get("baseModel", ""),
                model_name + " " + json_data.get("name", ""),
                url,
                latest_url,
                image)
        except:
            print("Exception when getting json data.")
            return ("", "", "", "", image)

class Sage_GetFileHash(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        folder_list = list(folder_paths.folder_names_and_paths.keys())
        return {
            "required": {
                "base_dir": (folder_list, {"defaultInput": False}),
                "filename": (IO.STRING, {"defaultInput": False}),
            }
        }

    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ("hash",)

    FUNCTION = "get_hash"

    CATEGORY = "Sage Utils/util"
    DESCRIPTION = "Get an sha256 hash of a file."

    def get_hash(self, base_dir, filename) -> tuple[str]:
        the_hash = ""
        try:
            file_path = folder_paths.get_full_path_or_raise(base_dir, filename)
            pull_metadata(file_path)
            the_hash = cache.hash[file_path]
        except:
            print(f"Unable to hash file '{filename}'. \n")
            the_hash = ""

        print(f"Hash for '{filename}': {the_hash}")
        return (str(the_hash),)
