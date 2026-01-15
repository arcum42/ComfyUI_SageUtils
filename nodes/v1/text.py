# Text nodes.
# This contains any nodes that are dealing with text, including setting text, joining text, cleaning text, and viewing text.

from __future__ import annotations
from comfy.comfy_types.node_typing import ComfyNodeABC, InputTypeDict, IO
from typing_extensions import override
import random
import string
import logging

# Import specific utilities instead of wildcard import
from ...utils import (
    clean_text, get_save_file_path,
    sage_wildcard_path,
    path_manager
)

from dynamicprompts.generators import RandomPromptGenerator
from dynamicprompts.wildcards.wildcard_manager import WildcardManager
from ...utils.constants import (
    LUMINA2_SYSTEM_PROMPTS_V2,
    LUMINA2_SYSTEM_PROMPT,
    PROMPT_START,
    LUMINA2_SYSTEM_PROMPT_TIP,
    PONY_V6_RATING,
    PONY_V7_RATING,
    PONY_SOURCE,
    PONY_V6_STYLE
)

class Sage_SystemPrompt(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(s) -> InputTypeDict:
        return {
            "required": {
                "system": (IO.COMBO, {"options": list(LUMINA2_SYSTEM_PROMPTS_V2.keys()), "default": "superior", "tooltip": LUMINA2_SYSTEM_PROMPT_TIP})
            }
        }

    RETURN_TYPES = (IO.STRING,)
    FUNCTION = "pass_system"

    CATEGORY = "Sage Utils/text/specialized"
    DESCRIPTION = "Picks the system prompt based on the selected option."

    def pass_system(self, system: str) -> tuple[str]:
        """
        Picks the system prompt based on the selected option.
        """
        # Use the mapping; default to empty string if not found
        ret = LUMINA2_SYSTEM_PROMPTS_V2.get(system, "")
        return (ret,)

class Sage_PromptText(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(s) -> InputTypeDict:
        return {
            "required": {
                "system": (IO.STRING, {"forceInput": True, "multiline": True}),
                "prompt": (IO.STRING, {"forceInput": True, "multiline": True})
            }
        }

    RETURN_TYPES = (IO.STRING,)
    FUNCTION = "pass_prompt"

    CATEGORY = "Sage Utils/text/specialized"
    DESCRIPTION = "Combines a system prompt and a user prompt into a single prompt, with <Prompt Start> between them."

    def pass_prompt(self, system: str, prompt: str) -> tuple[str]:
        """
        Combines a system prompt and a user prompt into a single prompt, with <Prompt Start> between them.
        """

        combined_prompt = f"{system}{PROMPT_START}{prompt}"
        return (combined_prompt,)

class Sage_IntToStr(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(s) -> InputTypeDict:
        return {
            "required": {
                "num": (IO.INT, {"default": 0})
            }
        }

    RETURN_TYPES = (IO.STRING,)
    FUNCTION = "num_to_str"
    CATEGORY = "Sage Utils/text"
    DESCRIPTION = "Converts a number to a string."

    def num_to_str(self, num: int) -> tuple[str]:
        """
        Converts a number to a string.
        """

        return (str(num),)

class Sage_FloatToStr(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(s) -> InputTypeDict:
        return {
            "required": {
                "num": (IO.FLOAT, {"default": 0.0})
            }
        }

    RETURN_TYPES = (IO.STRING,)
    FUNCTION = "num_to_str"
    CATEGORY = "Sage Utils/text"
    DESCRIPTION = "Converts a float to a string."

    def num_to_str(self, num: float) -> tuple[str]:
        """
        Converts a float to a string.
        """

        return (f"{num:.2g}",)

class SageSetWildcardText(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "optional": {
                "prefix": (IO.STRING, {"forceInput": True, "multiline": True}),
                "suffix": (IO.STRING, {"forceInput": True, "multiline": True})
            },
            "required": {
                "str": (IO.STRING, {"forceInput": False, "dynamicPrompts": True, "multiline": True}),
                "seed": (IO.INT, {"default": 0, "min": 0, "max": 2**32-1, "step": 1}),
                "clean": (IO.BOOLEAN, {"default": False})
            }
        }

    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ("str",)
    FUNCTION = "set_wildcard_text"
    CATEGORY = "Sage Utils/text"
    DESCRIPTION = "Loads user defined wildcard from the wildcards directory, and applies them to any wildcards in the text."
    
    def set_wildcard_text(self, str, prefix=None, suffix=None, seed=0, clean = False) -> tuple[str]:
        """
        Sets the text with wildcards replaced by their values.
        """
        str = f"{prefix or ''}{str}{suffix or ''}"

        # Initialize the wildcard manager
        wildcard_manager = WildcardManager(sage_wildcard_path)

        # Generate a random prompt using the wildcard manager
        generator = RandomPromptGenerator(wildcard_manager, seed=seed)

        # Replace wildcards in the string
        gen_str = generator.generate(str)
        str = ""
        if not gen_str:
            str = ""
        elif isinstance(gen_str, list):
            str = gen_str[0] if gen_str else ""
        else:
            str = gen_str

        # Clean the string if requested
        if clean:
            str = clean_text(str)

        return (str,)

class Sage_SetText(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "optional": {
                "prefix": (IO.STRING, {"forceInput": True, "multiline": True}),
                "suffix": (IO.STRING, {"forceInput": True, "multiline": True})
            },
            "required": {
                "str": (IO.STRING, {"forceInput": False, "dynamicPrompts": False, "multiline": True})
            }
        }

    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ("str",)

    FUNCTION = "pass_str"

    CATEGORY = "Sage Utils/text"
    DESCRIPTION = "Sets some text."

    def pass_str(self, str, prefix=None, suffix=None) -> tuple[str]:
        return (f"{prefix or ''}{str}{suffix or ''}",)

class Sage_SetTextWithInt(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "optional": {
                "prefix": (IO.STRING, {"forceInput": True, "multiline": True}),
                "suffix": (IO.STRING, {"forceInput": True, "multiline": True})
            },
            "required": {
                "str": (IO.STRING, {"forceInput": False, "dynamicPrompts": False, "multiline": False}),
                "number": (IO.INT, {"forceInput": False})
            }
        }

    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ("str",)

    FUNCTION = "pass_str"

    CATEGORY = "Sage Utils/text"
    DESCRIPTION = "Sets some text and adds a number at the end."

    def pass_str(self, str, prefix=None, suffix=None, number=0) -> tuple[str]:
        return (f"{prefix or ''}{str}{suffix or ''}{number or ''}",)

class Sage_TextSwitch(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "str": (IO.STRING, {"forceInput": True, "multiline": True}),
                "active": (IO.BOOLEAN, {"default": True})
            }
        }

    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ("str",)

    FUNCTION = "text_switch"

    CATEGORY = "Sage Utils/text"
    DESCRIPTION = "Passes the text if active is true, otherwise passes an empty string."

    def text_switch(self, str: str, active: bool) -> tuple[str]:
        return (str if active else "",)
class Sage_SaveText(ComfyNodeABC):

    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "filename_prefix": (IO.STRING, {"default": "ComfyUI_Text", "tooltip": "The prefix for the file to save. This may include formatting information such as %date:yyyy-MM-dd% to include values from nodes."}),
                "file_extension": (IO.STRING, {"default": "txt", "tooltip": "The file extension to use for the saved file."}),
                "text": (IO.STRING, {"forceInput": True, "multiline": True}),
                "batch_size": (IO.INT, {"default": 1, "tooltip": "The number of files to save."})
            }
        }

    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ("filepath",)

    FUNCTION = "save_text"

    CATEGORY = "Sage Utils/text"
    DESCRIPTION = "Saves the text to a file."

    def save_text(self, filename_prefix: str, file_extension: str, text: str, batch_size: int) -> tuple[str]:
        if '\n' in filename_prefix:
            filename_prefix_lines = filename_prefix.splitlines()
            filename_prefix = ''.join(filename_prefix_lines)
        if file_extension.startswith('.'):
            file_extension = file_extension[1:]
        full_path = ""
        for i in range(batch_size):
            full_path = get_save_file_path(filename_prefix, file_extension)
            if not full_path:
                raise ValueError("Invalid file path.")

            with open(full_path, 'w', encoding='utf-8') as file:
                file.write(text)

            logging.info(f"Text saved to {full_path}")
        return (full_path,)

class Sage_JoinText(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "separator": (IO.STRING, {"default": ', '}),
                "add_separator_to_end": (IO.BOOLEAN, {"default": False, "tooltip": "Add separator to the end of the joined string."}),
                "str1": (IO.STRING, {"multiline": True}),
                "str2": (IO.STRING, {"multiline": True}),
            }
        }

    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ("str",)

    FUNCTION = "join_str"

    CATEGORY = "Sage Utils/text/join"
    DESCRIPTION = "Joins two strings with a separator."

    def join_str(self, separator, add_separator_to_end , str1, str2) -> tuple[str]:
        if add_separator_to_end:
            # Add separator to the end of the joined string
            return (separator.join([str1, str2]) + separator,)
        else:
            """
            Normal join without adding separator to the end.
            """
            # Join the strings with the separator
            return (separator.join([str1, str2]),)

class Sage_TripleJoinText(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "separator": (IO.STRING, {"default": ', '}),
                "add_separator_to_end": (IO.BOOLEAN, {"default": False, "tooltip": "Add separator to the end of the joined string."}),
                "str1": (IO.STRING, {"multiline": True}),
                "str2": (IO.STRING, {"multiline": True}),
                "str3": (IO.STRING, {"multiline": True})
            }
        }

    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ("str",)

    FUNCTION = "join_str"

    CATEGORY = "Sage Utils/text/join"
    DESCRIPTION = "Joins three strings with a separator."

    def join_str(self, separator, add_separator_to_end, str1, str2, str3) -> tuple[str]:
        if (add_separator_to_end):
            return (separator.join([str1, str2, str3]) + separator,)
        else:
            return (separator.join([str1, str2, str3]),)

class Sage_CleanText(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "str": (IO.STRING, {"multiline": True}),
            }
        }

    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ("cleaned_string",)

    FUNCTION = "clean_str"

    CATEGORY = "Sage Utils/text"
    DESCRIPTION = "Cleans up the string given."

    def clean_str(self, str) -> tuple[str]:
        return (clean_text(str),)

class Sage_ViewAnything(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "any": (IO.ANY, {"forceInput": True, "multiline": True})
            }
        }

    RETURN_TYPES = (IO.STRING,)

    FUNCTION = "show_text"

    CATEGORY = "Sage Utils/text"
    DESCRIPTION = "Shows some text."
    OUTPUT_NODE = True
    INPUT_IS_LIST = True

    def show_text(self, any) -> dict:
        str = ""
        if isinstance(any, list):
            for t in any:
                str += f"{t}\n"
            str = str.strip()
        else:
            str = any
        return { "ui": {"text": str}, "result" : (str,) }

class Sage_TextRandomLine(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "text": (IO.STRING, {"multiline": True}),
                "seed": (IO.INT, {"default": 0, "min": 0, "max": 2**32-1, "step": 1})
            }
        }

    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ("random_line",)

    FUNCTION = "get_random_line"

    CATEGORY = "Sage Utils/text"
    DESCRIPTION = "Returns a random line from the given text."

    def get_random_line(self, text: str, seed: int) -> tuple[str]:
        lines = text.splitlines()
        if not lines:
            return ("",)
        random.seed(seed)
        random_line = lines[random.randint(0, len(lines) - 1)].strip()
        return (random_line,)

class Sage_TextSelectLine(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "text": (IO.STRING, {"multiline": True}),
                "line_number": (IO.INT, {"default": 0, "min": 0, "max": 10000, "step": 1})
            }
        }

    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ("selected_line",)

    FUNCTION = "select_line"

    CATEGORY = "Sage Utils/text"
    DESCRIPTION = "Selects a specific line from the given text based on the line number. Line numbers start from 0. If the line number is out of range, it will select the first or last line as appropriate."

    def select_line(self, text: str, line_number: int) -> tuple[str]:
        lines = text.splitlines()
        if not lines:
            return ("",)
        if line_number < 0:
            line_number = 0
        elif line_number >= len(lines):
            line_number = len(lines) - 1
        selected_text = lines[line_number].strip()
        return (selected_text,)

# This node takes a text box (with a prefix and suffix) and dynamic string inputs, and substitutes the strings for the 
# placeholders in the text box.
class Sage_TextSubstitution(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "text": (IO.STRING, {"default": "", "multiline": True}),
                "delimiter": (IO.STRING, {"default": "$"})
            },
            "optional": {
                "prefix": (IO.STRING, {"forceInput": True, "multiline": True}),
                "suffix": (IO.STRING, {"forceInput": True, "multiline": True}),
            }
        }

    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ("result",)

    FUNCTION = "substitute_text"
    CATEGORY = "Sage Utils/text"
    DESCRIPTION = "Substitutes the placeholders in the text with the provided strings. The placeholders use the specified delimiter (default $) followed by str_1, str_2, etc. based on the number of connected inputs. The prefix and suffix are added to the final result."

    def substitute_text(self, text: str, delimiter: str = "$", prefix: str = "", suffix: str = "", **kwargs) -> tuple[str]:
        """
        Substitutes the placeholders in the text with the provided strings.
        The placeholders use the specified delimiter followed by str_1, str_2, etc. based on the number of connected inputs.
        The prefix and suffix are added to the final result.
        """
        # Build substitution dictionary from dynamic inputs
        sub_dict = {}
        
        # Extract str_X inputs from kwargs
        for key, value in kwargs.items():
            if key.startswith("str_"):
                sub_dict[key] = value or ""
            else:
                logging.warning(f"Key '{key}' does not start with 'str_', skipping substitution.")

        # Create a dynamic Template class with the specified delimiter
        # We need to create this dynamically to avoid class-level variable conflicts
        def create_template_class(delim):
            class CustomTemplate(string.Template):
                delimiter = delim
            return CustomTemplate
        
        # Get the custom Template class with our delimiter
        TemplateClass = create_template_class(delimiter)
        
        # Create Template and perform substitution
        template = TemplateClass(text)
        try:
            result = template.substitute(sub_dict)
        except ValueError as e:
            # Handle invalid placeholder errors - likely due to delimiter conflicts
            # Fall back to safe_substitute which is more forgiving
            try:
                result = template.safe_substitute(sub_dict)
            except Exception as fallback_error:
                # Last resort: manual string replacement
                result = text
                for key, value in sub_dict.items():
                    placeholder = f"{delimiter}{key}"
                    result = result.replace(placeholder, str(value))
        except KeyError as e:
            # If a placeholder is missing, use safe_substitute to leave it as-is
            result = template.safe_substitute(sub_dict)

        # Add prefix and suffix
        result = f"{prefix}{result}{suffix}"

        return (result,)

class Sage_TextWeight(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "text": (IO.STRING, {"multiline": True}),
                "weight": (IO.FLOAT, {"default": 1.0, "min": -10.0, "max": 10.0, "step": 0.05}),
                "separator": (IO.STRING, {"default": ', '})
            }
        }

    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ("weighted_text",)

    FUNCTION = "weight_text"

    CATEGORY = "Sage Utils/text"
    DESCRIPTION = "Applies a weight to a text string."

    def weight_text(self, text: str, weight: float, separator: str) -> tuple[str]:
        return (f"({text}:{weight:.2g}){separator}",)

class Sage_ViewNotes(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls):
        # Get list of files in notes directory
        notes_files = []
        try:
            notes_path = path_manager.notes_path
            if notes_path.exists():
                notes_files = [f.name for f in notes_path.iterdir() if f.is_file()]
                notes_files.sort()  # Sort alphabetically
        except Exception as e:
            logging.error(f"Error reading notes directory: {e}")
            notes_files = ["No files found"]
        
        if not notes_files:
            notes_files = ["No files found"]
            
        # type: ignore
        return {
            "required": {
                "filename": (IO.COMBO, {"options": notes_files})
            }
        }

    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ("content",)

    FUNCTION = "view_notes"

    CATEGORY = "Sage Utils/text"
    DESCRIPTION = "Views the contents of a selected file from the notes directory."
    OUTPUT_NODE = True

    def view_notes(self, filename) -> dict:
        """
        Reads and returns the content of the selected notes file.
        """
        try:
            if filename == "No files found":
                content = "No notes files found in the notes directory."
            else:
                notes_file_path = path_manager.notes_path / filename
                if notes_file_path.exists() and notes_file_path.is_file():
                    with open(notes_file_path, 'r', encoding='utf-8') as file:
                        content = file.read()
                else:
                    content = f"File '{filename}' not found in notes directory."
        except Exception as e:
            content = f"Error reading file '{filename}': {str(e)}"
        
        return {"ui": {"text": content}, "result": (content,) }

class Sage_HiDreamE1_Instruction(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "instruction": (IO.STRING, {"multiline": True}),
                "description": (IO.STRING, {"multiline": True})
            }
        }

    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ("prompt",)
    
    FUNCTION = "generate_prompt"
    
    CATEGORY = "Sage Utils/text/specialized"
    DESCRIPTION = "Generates a prompt for HiDream E1 based on the given instruction and description."

    def generate_prompt(self, instruction: str, description: str) -> tuple[str]:
        # Clean the instruction and description
        cleaned_instruction = clean_text(instruction)
        cleaned_description = clean_text(description)

        if not cleaned_instruction:
            raise ValueError("Instruction cannot be empty.")
        elif not cleaned_description:
            raise ValueError("Description cannot be empty.")
        elif cleaned_instruction[-1] != ".":
            logging.warning(f"Last character of instruction is '{cleaned_instruction[-1]}'")
            cleaned_instruction += "."

        # Generate the prompt
        prompt = f"Instruction: {cleaned_instruction}\nDescription: {cleaned_description}"

        return (prompt,)

class Sage_PonyScore(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "score_start": (IO.INT, {"default": 9, "min": 0, "max": 9, "step": 1}),
                "score_end": (IO.INT, {"default": 4, "min": 0, "max": 9, "step": 1}),
                "up_to": (IO.BOOLEAN, {"default": True, "tooltip": "If true, adds '_up' to the score string, except for score_9. (v6 uses up, v7 doesn't)"})
            }
        }

    RETURN_TYPES = (IO.STRING,)

    FUNCTION = "create_score"
    CATEGORY = "Sage Utils/text/pony"
    DESCRIPTION = "Creates a score string for pony prompts based on the given start and end scores."

    def create_score(self, score_start: int, score_end: int, up_to: bool) -> tuple[str]:
        score_range = range(score_start, score_end - 1, -1)
        score_text = ""
        for s in score_range:
            if s == 9:
                score_text += f"score_{s}, "
            elif s < 9:
                score_text += f"score_{s}{'_up' if up_to else ''}, "
        return (score_text,)

class Sage_PonyRatingv6(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "rating": (PONY_V6_RATING, {}),
            }
        }

    RETURN_TYPES = (IO.STRING,)

    FUNCTION = "create_rating"
    CATEGORY = "Sage Utils/text/pony"
    DESCRIPTION = "Creates a rating string for pony prompts based on the given rating. (v6 style)"

    def create_rating(self, rating: str) -> tuple[str]:
        if rating == "none":
            return ("",)
        else:
            return (f"rating_{rating}, ",)

class Sage_PonyRatingv7(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "rating": (PONY_V7_RATING, {}),
            }
        }

    RETURN_TYPES = (IO.STRING,)

    FUNCTION = "create_rating"
    CATEGORY = "Sage Utils/text/pony"
    DESCRIPTION = "Creates a rating string for pony prompts based on the given rating. (v7 style)"

    def create_rating(self, rating: str) -> tuple[str]:
        if rating == "none":
            return ("",)
        else:
            return (f"rating_{rating}, ",)

class Sage_PonySource(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "source": (PONY_SOURCE, {}),
            }
        }

    RETURN_TYPES = (IO.STRING,)

    FUNCTION = "create_source"
    CATEGORY = "Sage Utils/text/pony"
    DESCRIPTION = "Creates a source string for pony prompts based on the given source."

    def create_source(self, source: str) -> tuple[str]:
        if source == "none":
            return ("",)
        else:
            return (f"source_{source}, ",)  

# Output "style_cluster_x" where x is a number from 1 to 2048
class Sage_PonyStyleCluster(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "style_cluster": (IO.INT, {"default": 1, "min": 1, "max": 2048, "step": 1}),
            }
        }

    RETURN_TYPES = (IO.STRING,)

    FUNCTION = "create_style_cluster"
    CATEGORY = "Sage Utils/text/pony"
    DESCRIPTION = "Creates a style cluster string for pony prompts based on the given style cluster number."

    def create_style_cluster(self, style_cluster: int) -> tuple[str]:
        return (f"style_cluster_{style_cluster}, ",)

class Sage_PonyPrefix(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "add_score": (IO.BOOLEAN, {}),
                "score_start": (IO.INT, {"default": 9, "min": 0, "max": 9, "step": 1}),
                "score_end": (IO.INT, {"default": 4, "min": 0, "max": 9, "step": 1}),
                "rating": (["none", "safe", "questionable", "explicit"], {}),
                "source": (["none", "pony", "furry", "anime", "cartoon", "3d", "western", "comic", "monster"], {}),
            }
        }

    RETURN_TYPES = (IO.STRING,)

    FUNCTION = "create_prefix"
    CATEGORY = "Sage Utils/text/pony"

    def create_prefix(self, add_score: bool, score_start: int, score_end: int, rating: str, source: str, prompt=None) -> tuple[str]:
        prefix = ""

        if add_score:
            score_range = range(score_start, score_end - 1, -1)
            score_text = ""
            for s in score_range:
                if s == 9:
                    score_text += f"score_{s}, "
                elif s < 9:
                    score_text += f"score_{s}_up, "
            prefix += score_text

        prefix += f"source_{source}, " if source != "none" else ""
        prefix += f"rating_{rating}, " if rating != "none" else ""
        return (prefix,)


class Sage_PonyStyle(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "style": (PONY_V6_STYLE, {"multi_select": True, "chip": True, "placeholder": "Pony Style"})
            }
        }

    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ("text",)

    FUNCTION = "return_style"

    CATEGORY = "Sage Utils/text/pony"
    DESCRIPTION = "Adds the chosen three letter artist styles from Pony v6."

    def return_style(self, style) -> tuple[str]:
        return (", ".join(style),)

TEXT_CLASS_MAPPINGS = {
    "Sage_SetText": Sage_SetText,
    "Sage_SetTextWithInt": Sage_SetTextWithInt,
    "Sage_TextSwitch": Sage_TextSwitch,
    "SageSetWildcardText": SageSetWildcardText,
    "Sage_TextSubstitution": Sage_TextSubstitution,
    "Sage_JoinText": Sage_JoinText,
    "Sage_TripleJoinText": Sage_TripleJoinText,
    "Sage_CleanText": Sage_CleanText,
    "Sage_TextSelectLine": Sage_TextSelectLine,
    "Sage_TextRandomLine": Sage_TextRandomLine,
    "Sage_TextWeight": Sage_TextWeight,
    "Sage_IntToStr": Sage_IntToStr,
    "Sage_FloatToStr": Sage_FloatToStr,
    "Sage_ViewAnything": Sage_ViewAnything,
    "Sage_ViewNotes": Sage_ViewNotes,
    "Sage_SaveText": Sage_SaveText,
    "Sage_HiDreamE1_Instruction": Sage_HiDreamE1_Instruction,
    "Sage_PromptText": Sage_PromptText,
    "Sage_SystemPrompt": Sage_SystemPrompt
}

PONY_CLASS_MAPPINGS = {
    "Sage_PonyPrefix": Sage_PonyPrefix,
    "Sage_PonyStyle": Sage_PonyStyle,
    "Sage_PonyStyleCluster": Sage_PonyStyleCluster,
    "Sage_PonySource": Sage_PonySource,
    "Sage_PonyRatingv7": Sage_PonyRatingv7,
    "Sage_PonyRatingv6": Sage_PonyRatingv6,
    "Sage_PonyScore": Sage_PonyScore
}

TEXT_NAME_MAPPINGS = {
    "Sage_SetText": "Set Text",
    "Sage_SetTextWithInt": "Text w/ Int",
    "Sage_TextSwitch": "Text Switch",
    "SageSetWildcardText": "Set Text (Wildcards)",
    "Sage_TextSubstitution": "Text Substitution",
    "Sage_JoinText": "Join Text",
    "Sage_TripleJoinText": "Join Text x3",
    "Sage_CleanText": "Clean Text",
    "Sage_TextSelectLine": "Select Line from Text",
    "Sage_TextRandomLine": "Random Line from Text",
    "Sage_TextWeight": "Text Weight",
    "Sage_IntToStr": "Int to String",
    "Sage_FloatToStr": "Float to String",
    "Sage_ViewAnything": "View Any Node as Text",
    "Sage_ViewNotes": "View Notes",
    "Sage_SaveText": "Save Text",
    "Sage_HiDreamE1_Instruction": "HiDreamE1 Instruction",
    "Sage_PromptText": "Prompt Text (Lumina 2)",
    "Sage_SystemPrompt": "System Prompt (Lumina 2)"
}

PONY_NAME_MAPPINGS = {
    "Sage_PonyPrefix": "Add Pony v6 Prefixes",
    "Sage_PonyStyle": "Add Pony Style",
    "Sage_PonyStyleCluster": "Pony Style Cluster",
    "Sage_PonySource": "Pony Source",
    "Sage_PonyRatingv7": "Pony Rating (v7)",
    "Sage_PonyRatingv6": "Pony Rating (v6)",
    "Sage_PonyScore": "Pony Score"
}
