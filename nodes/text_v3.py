# Text nodes, v3 edition.
# This contains any nodes that are dealing with text, including setting text, joining text, cleaning text, and viewing text.
# See ref_docs/v3_migration.md for info on migrating to v3 nodes.

from __future__ import annotations
from comfy_api.latest import io, ui
import random
import string

# Import specific utilities from source modules
from ..utils.prompt_utils import clean_text, get_save_file_path
from ..utils.sage_utils import sage_wildcard_path
from ..utils.path_manager import path_manager

from dynamicprompts.generators import RandomPromptGenerator
from dynamicprompts.wildcards.wildcard_manager import WildcardManager

class Sage_SetText(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_SetText",
            display_name="Set Text",
            description="Sets some text.",
            category="Sage Utils/text/input",
            inputs = [
                io.String.Input("str", display_name="str", force_input = False, dynamic_prompts = False, multiline = True),
                io.String.Input("prefix", display_name="prefix", force_input = True, multiline = True, optional=True),
                io.String.Input("suffix", display_name="suffix", force_input = True, multiline = True, optional=True)
            ],
            outputs = [
                io.String.Output("str_out", display_name="str")
            ],
        )
    @classmethod
    def execute(cls, **kwargs):
        str = kwargs.get("str", "")
        prefix = kwargs.get("prefix", "")
        suffix = kwargs.get("suffix", "")

        return io.NodeOutput(f"{prefix or ''}{str}{suffix or ''}")

def remove_comments_from_text(text: str) -> str:
    lines = text.splitlines()
    filtered_lines = []
    in_block_comment = False
    
    for line in lines:
        # Handle block comments /* */
        while "/*" in line and "*/" in line:
            start = line.find("/*")
            end = line.find("*/", start)
            line = line[:start] + line[end+2:]
        
        if "/*" in line:
            in_block_comment = True
            line = line[:line.find("/*")]
        elif "*/" in line:
            in_block_comment = False
            line = line[line.find("*/")+2:]
        elif in_block_comment:
            line = ""
        
        # Remove Python-style comments (#)
        if "#" in line:
            line = line[:line.find("#")]
        
        # Remove C/C++ line comments (//)
        if "//" in line:
            line = line[:line.find("//")]
        
        # Only add non-empty lines
        stripped = line.rstrip()
        if stripped:
            filtered_lines.append(stripped)
    
    cleaned_str = "\n".join(filtered_lines)
    return cleaned_str

class Sage_SetTextWithoutComments(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_SetTextWithoutComments",
            display_name="Set Text Without Comments",
            description="Sets some text after removing comments (Python #, C/C++ //, and /* */ style).",
            category="Sage Utils/text/input",
            inputs = [
                io.String.Input("str", display_name="str", force_input = False, dynamic_prompts = False, multiline = True),
                io.String.Input("prefix", display_name="prefix", force_input = True, multiline = True, optional=True),
                io.String.Input("suffix", display_name="suffix", force_input = True, multiline = True, optional=True)
            ],
            outputs = [
                io.String.Output("str_out", display_name="str")
            ],
        )
    @classmethod
    def execute(cls, **kwargs):
        str = kwargs.get("str", "")
        prefix = kwargs.get("prefix", "")
        suffix = kwargs.get("suffix", "")
        
        cleaned_str = remove_comments_from_text(str)

        return io.NodeOutput(f"{prefix or ''}{cleaned_str}{suffix or ''}")

class Sage_TextSubstitution(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        autogrow_template = io.Autogrow.TemplatePrefix(
            input = io.String.Input("strings"),
            prefix = "str_",
            min = 1,
            max = 100
        )
        return io.Schema(
            node_id="Sage_TextSubstitution",
            display_name="Text Substitution",
            description="Substitutes the placeholders in the text with the provided strings. The placeholders use the specified delimiter (default $) followed by str_1, str_2, etc. based on the number of connected inputs. The prefix and suffix are added to the final result.",
            category="Sage Utils/text/input",
            inputs=[
                io.String.Input("text", display_name="text", default="", multiline=True),
                io.String.Input("delimiter", display_name="delimiter", default="$"),
                io.String.Input("prefix", display_name="prefix", force_input=True, multiline=True, optional=True),
                io.String.Input("suffix", display_name="suffix", force_input=True, multiline=True, optional=True),
                io.Autogrow.Input("strings", template=autogrow_template)
            ],
            outputs=[
                io.String.Output("result", display_name="result")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        text = kwargs.get("text", "")
        delimiter = kwargs.get("delimiter", "$")
        prefix = kwargs.get("prefix", "")
        suffix = kwargs.get("suffix", "")
        strings = kwargs.get("strings", [])
        
        # Build substitution dictionary from dynamic inputs
        sub_dict = {}
        
        # Extract str_X inputs from strings
        for key, value in strings.items():
            if key.startswith("str_"):
                sub_dict[key] = value or ""
        
        # Create a dynamic Template class with the specified delimiter
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
        except ValueError:
            # Handle invalid placeholder errors - likely due to delimiter conflicts
            try:
                result = template.safe_substitute(sub_dict)
            except Exception:
                # Last resort: manual string replacement
                result = text
                for key, value in sub_dict.items():
                    placeholder = f"{delimiter}{key}"
                    result = result.replace(placeholder, str(value))
        except KeyError:
            # If a placeholder is missing, use safe_substitute to leave it as-is
            result = template.safe_substitute(sub_dict)
        
        # Add prefix and suffix
        result = f"{prefix or ''}{result}{suffix or ''}"
        
        return io.NodeOutput(result)

class Sage_SetTextWithDynamicPrompts(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="SageSetWildcardText",
            display_name="Text w/ Dynamic Prompts",
            description="Loads user defined wildcard from the wildcards directory, and applies them to any wildcards in the text using the dynamic prompts library.",
            category="Sage Utils/text/input",
            inputs=[
                io.String.Input("str_input", display_name="str", force_input=False, dynamic_prompts=True, multiline=True),
                io.Int.Input("seed", display_name="seed", default=0, min=0, max=2**32-1, step=1),
                io.Boolean.Input("clean", display_name="clean", default=False),
                io.String.Input("prefix", display_name="prefix", force_input=True, multiline=True, optional=True),
                io.String.Input("suffix", display_name="suffix", force_input=True, multiline=True, optional=True)
            ],
            outputs=[
                io.String.Output("str_output", display_name="str")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        str_val = kwargs.get("str_input", "")
        prefix = kwargs.get("prefix", "")
        suffix = kwargs.get("suffix", "")
        seed = kwargs.get("seed", 0)
        clean = kwargs.get("clean", False)
        
        str_val = f"{prefix or ''}{str_val}{suffix or ''}"
        
        # Initialize the wildcard manager
        wildcard_manager = WildcardManager(sage_wildcard_path)
        
        # Generate a random prompt using the wildcard manager
        generator = RandomPromptGenerator(wildcard_manager, seed=seed)
        
        # Replace wildcards in the string
        gen_str = generator.generate(str_val)
        if not gen_str:
            str_val = ""
        elif isinstance(gen_str, list):
            str_val = gen_str[0] if gen_str else ""
        else:
            str_val = gen_str
        
        # Clean the string if requested
        if clean:
            str_val = clean_text(str_val)
        
        return io.NodeOutput(str_val)

class Sage_ViewAnything(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_ViewAnything",
            display_name="View Anything",
            description="Shows some text.",
            category="Sage Utils/text/output",
            is_output_node=True,
            inputs=[
                io.AnyType.Input("any", display_name="any")
            ],
            outputs=[
                io.String.Output("str", display_name="str")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        any_val = kwargs.get("any", "")
        
        str_val = ""
        if isinstance(any_val, list):
            for t in any_val:
                str_val += f"{t}\n"
            str_val = str_val.strip()
        else:
            str_val = str(any_val)
    
        return io.NodeOutput(str_val, ui = ui.PreviewText(str(str_val)))

class Sage_SaveText(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_SaveText",
            display_name="Save Text",
            description="Saves the text to a file.",
            category="Sage Utils/text/output",
            inputs=[
                io.String.Input("filename_prefix", display_name="filename_prefix", default="ComfyUI_Text", tooltip="The prefix for the file to save. This may include formatting information such as %date:yyyy-MM-dd% to include values from nodes."),
                io.String.Input("file_extension", display_name="file_extension", default="txt", tooltip="The file extension to use for the saved file."),
                io.String.Input("text", display_name="text", force_input=True, multiline=True),
                io.Int.Input("batch_size", display_name="batch_size", default=1, tooltip="The number of files to save.")
            ],
            outputs=[
                io.String.Output("filepath", display_name="filepath")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        filename_prefix = kwargs.get("filename_prefix", "ComfyUI_Text")
        file_extension = kwargs.get("file_extension", "txt")
        text = kwargs.get("text", "")
        batch_size = kwargs.get("batch_size", 1)
        
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
        
        return io.NodeOutput(str(full_path))

class Sage_ViewNotes(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        # Get list of files in notes directory
        notes_files = []
        try:
            notes_path = path_manager.notes_path
            if notes_path.exists():
                notes_files = [f.name for f in notes_path.iterdir() if f.is_file()]
                notes_files.sort()  # Sort alphabetically
        except Exception:
            notes_files = ["No files found"]
        
        if not notes_files:
            notes_files = ["No files found"]
        
        return io.Schema(
            node_id="Sage_ViewNotes",
            display_name="View Notes",
            description="Views the contents of a selected file from the notes directory.",
            category="Sage Utils/text/output",
            is_output_node=True,
            inputs=[
                io.Combo.Input("filename", display_name="filename", options=notes_files)
            ],
            outputs=[
                io.String.Output("content", display_name="content")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        filename = kwargs.get("filename", "No files found")
        
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
        
        return io.NodeOutput(content)

class Sage_NumberToStr(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_NumberToStr",
            display_name="Number to String",
            description="Converts a number to a string.",
            category="Sage Utils/text/conversion",
            inputs=[
                io.DynamicCombo.Input("num_type", options=[
                    io.DynamicCombo.Option("float", [
                        io.Float.Input("num", display_name="num", default=0.0, step=0.01)
                    ]),
                    io.DynamicCombo.Option("int", [
                        io.Int.Input("num", display_name="num", default=0)
                    ])
                ])
            ],
            outputs=[
                io.String.Output("str", display_name="str")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        base = kwargs.get("num_type", {})
        num_type = base.get("num_type", "float")
        num = base.get("num", 0.0)
        if num_type == "int":
            return io.NodeOutput(f"{int(num)}")
        else:
            return io.NodeOutput(f"{num}")

class Sage_AnythingToStr(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_AnythingToStr",
            display_name="Anything to String",
            description="Converts any input to a string.",
            category="Sage Utils/text/conversion",
            inputs=[
                io.AnyType.Input("any", display_name="any")
            ],
            outputs=[
                io.String.Output("str", display_name="str")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        any_val = kwargs.get("any", "")

        if isinstance(any_val, list):
            str_val = "\n".join(str(t) for t in any_val)
        else:
            str_val = str(any_val)

        return io.NodeOutput(str_val)

class Sage_SetTextWithNum(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_SetTextWithNum",
            display_name="Set Text With Number",
            description="Sets some text and adds a number at the end.",
            category="Sage Utils/text/helper",
            inputs = [
                io.String.Input("str", display_name="str", force_input = False, dynamic_prompts = False, multiline = True),
                io.String.Input("prefix", display_name="prefix", force_input = True, multiline = True, optional=True),
                io.String.Input("suffix", display_name="suffix", force_input = True, multiline = True, optional=True),
                
                io.DynamicCombo.Input("num_type", options=[
                    io.DynamicCombo.Option("float", [
                        io.Float.Input("num", display_name="num", default=0.0, step=0.01)
                    ]),
                    io.DynamicCombo.Option("int", [
                        io.Int.Input("num", display_name="num", default=0)
                    ])
                ])
            ],
            outputs = [
                io.String.Output("str_out", display_name="str")
            ],
        )
    @classmethod
    def execute(cls, **kwargs):
        str = kwargs.get("str", "")
        prefix = kwargs.get("prefix", "")
        suffix = kwargs.get("suffix", "")
        base = kwargs.get("num_type", {})
        num_type = base.get("num_type", "float")
        num = base.get("num", 0.0)
        if num_type == "int":
            number = int(num)
        else:
            number = num

        return io.NodeOutput(f"{prefix or ''}{str}{suffix or ''}{number or ''}")

class Sage_TextWeight(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_TextWeight",
            display_name="Text Weight",
            description="Applies a weight to a text string.",
            category="Sage Utils/text/helper",
            inputs=[
                io.String.Input("text", display_name="text", multiline=True),
                io.Float.Input("weight", display_name="weight", default=1.0, min=-10.0, max=10.0, step=0.05),
                io.String.Input("separator", display_name="separator", default=", ")
            ],
            outputs=[
                io.String.Output("weighted_text", display_name="weighted_text")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        text = kwargs.get("text", "")
        weight = kwargs.get("weight", 1.0)
        separator = kwargs.get("separator", ", ")
        
        return io.NodeOutput(f"({text}:{weight:.2g}){separator}")

# Update TEXT_NODES list

class Sage_TextSwitch(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_TextSwitch",
            display_name="Text Switch",
            description="Passes the text if active is true, otherwise passes an empty string.",
            category="Sage Utils/text/helper",
            inputs=[
                io.String.Input("str", display_name="str", force_input=True, multiline=True),
                io.Boolean.Input("active", display_name="active", default=True)
            ],
            outputs=[
                io.String.Output("str_out", display_name="str")
            ]
        )

    @classmethod
    def execute(cls, **kwargs):
        str = kwargs.get("str", "")
        active = kwargs.get("active", True)
        return io.NodeOutput(str if active else "")

class Sage_CleanText(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_CleanText",
            display_name="Clean Text",
            description="Cleans up the string given.",
            category="Sage Utils/text/helper",
            inputs=[
                io.String.Input("str", display_name="str", force_input=True, multiline=True)
            ],
            outputs=[
                io.String.Output("cleaned_string", display_name="cleaned string")
            ]
        )

    @classmethod
    def execute(cls, **kwargs):
        str = kwargs.get("str", "")
        return io.NodeOutput(clean_text(str))

class Sage_DynamicJoinText(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        autogrow_template = io.Autogrow.TemplatePrefix(
            input=io.String.Input("strings"),  # template for each input
            prefix="str_",                  # prefix for generated input names
            min=1,                           # minimum number of inputs shown
            max=100,                          # maximum number of inputs allowed
        )
        return io.Schema(
            node_id="Sage_DynamicJoinText",
            display_name="Join Text",
            description="Joins multiple strings with a separator.",
            category="Sage Utils/text/helper",
            inputs=[
                io.Autogrow.Input("strings", template=autogrow_template),
                io.String.Input("separator", display_name="separator", default=", "),
                io.Boolean.Input("add_separator_to_end", display_name="add_separator_to_end", default=False, tooltip="Add separator to the end of the joined string.")
            ],
            outputs=[
                io.String.Output("str", display_name="str")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        separator = kwargs.get("separator", ", ")
        add_separator_to_end = kwargs.get("add_separator_to_end", False)
        strings_dict = kwargs.get("strings", {})        
        # Collect all inputs that start with "str_"
        strings = []
        for key, value in strings_dict.items():
            if key.startswith("str_") and isinstance(value, str):
                strings.append(value)
        
        result = separator.join(strings)
        if add_separator_to_end:
            result += separator
        
        return io.NodeOutput(result)

class Sage_JoinText(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_JoinText",
            display_name="Join Text (Legacy)",
            description="Joins two strings with a separator.",
            category="Sage Utils/text/helper",
            is_deprecated=True,
            inputs=[
                io.String.Input("separator", display_name="separator", default=", "),
                io.Boolean.Input("add_separator_to_end", display_name="add_separator_to_end", default=False, tooltip="Add separator to the end of the joined string."),
                io.String.Input("str1", display_name="str1", multiline=True),
                io.String.Input("str2", display_name="str2", multiline=True)
            ],
            outputs=[
                io.String.Output("str", display_name="str")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        separator = kwargs.get("separator", ", ")
        add_separator_to_end = kwargs.get("add_separator_to_end", False)
        str1 = kwargs.get("str1", "")
        str2 = kwargs.get("str2", "")
        
        result = separator.join([str1, str2])
        if add_separator_to_end:
            result += separator
        
        return io.NodeOutput(result)

class Sage_TripleJoinText(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_TripleJoinText",
            display_name="Triple Join Text (Legacy)",
            description="Joins three strings with a separator.",
            category="Sage Utils/text/helper",
            is_deprecated=True,
            inputs=[
                io.String.Input("separator", display_name="separator", default=", "),
                io.Boolean.Input("add_separator_to_end", display_name="add_separator_to_end", default=False, tooltip="Add separator to the end of the joined string."),
                io.String.Input("str1", display_name="str1", multiline=True),
                io.String.Input("str2", display_name="str2", multiline=True),
                io.String.Input("str3", display_name="str3", multiline=True)
            ],
            outputs=[
                io.String.Output("str", display_name="str")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        separator = kwargs.get("separator", ", ")
        add_separator_to_end = kwargs.get("add_separator_to_end", False)
        str1 = kwargs.get("str1", "")
        str2 = kwargs.get("str2", "")
        str3 = kwargs.get("str3", "")
        
        result = separator.join([str1, str2, str3])
        if add_separator_to_end:
            result += separator
        
        return io.NodeOutput(result)

class Sage_TextRandomLine(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_TextRandomLine",
            display_name="Text Random Line",
            description="Returns a random line from the given text.",
            category="Sage Utils/text/line",
            inputs=[
                io.String.Input("text", display_name="text", multiline=True),
                io.Int.Input("seed", display_name="seed", default=0)
            ],
            outputs=[
                io.String.Output("random_line", display_name="random_line")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        text = kwargs.get("text", "")
        seed = kwargs.get("seed", 0)
        
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        
        if not lines:
            return io.NodeOutput("")
        
        random.seed(seed)
        selected_line = random.choice(lines)
        
        return io.NodeOutput(selected_line)

class Sage_TextSelectLine(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_TextSelectLine",
            display_name="Text Select Line",
            description="Selects a specific line from the given text based on the line number. Line numbers start from 0.",
            category="Sage Utils/text/line",
            inputs=[
                io.String.Input("text", display_name="text", multiline=True),
                io.Int.Input("line_number", display_name="line_number", default=0, min=0)
            ],
            outputs=[
                io.String.Output("selected_line", display_name="selected_line")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        str = kwargs.get("text", "")
        line_number = kwargs.get("line_number", 0)
        
        lines = [line.strip() for line in str.split('\n') if line.strip()]
        
        if not lines:
            return io.NodeOutput("")
        
        # Clamp line_number to valid range
        line_number = max(0, min(line_number, len(lines) - 1))
        
        return io.NodeOutput(lines[line_number])

TEXT_NODES = [
    # input nodes
    Sage_SetText,
    Sage_SetTextWithoutComments,
    Sage_TextSubstitution,
    Sage_SetTextWithDynamicPrompts,
    
    #output nodes
    Sage_ViewAnything,
    Sage_SaveText,
    Sage_ViewNotes,
    
    # conversion nodes
    Sage_NumberToStr,
    Sage_AnythingToStr,
    
    # helper nodes
    Sage_SetTextWithNum, 
    Sage_TextWeight,
    Sage_TextSwitch, 
    Sage_CleanText, 
    
    Sage_DynamicJoinText,
    Sage_JoinText,
    Sage_TripleJoinText,
    
    # line selection/manipulation
    Sage_TextRandomLine,
    Sage_TextSelectLine
]
