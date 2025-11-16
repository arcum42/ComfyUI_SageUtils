# Text nodes, v3 edition.
# This contains any nodes that are dealing with text, including setting text, joining text, cleaning text, and viewing text.
# See ref_docs/v3_migration.md for info on migrating to v3 nodes.

from __future__ import annotations
from comfy_api.latest import io, ComfyExtension
from comfy.comfy_types.node_typing import ComfyNodeABC, InputTypeDict, IO
from typing_extensions import override
import random
import string

# Import specific utilities instead of wildcard import
from ..utils import (
    clean_text, get_save_file_path,
    sage_wildcard_path,
    path_manager
)

from dynamicprompts.generators import RandomPromptGenerator
from dynamicprompts.wildcards.wildcard_manager import WildcardManager
from ..utils.constants import (
    LUMINA2_SYSTEM_PROMPTS_V2,
    PROMPT_START,
    LUMINA2_SYSTEM_PROMPT_TIP,
    PONY_V6_RATING,
    PONY_V7_RATING,
    PONY_SOURCE
)

# To implement:
# Sage_PromptText - Lumina 2 prompt node
# Sage_SystemPrompt - Lumina 2 system prompt node

class Sage_IntToStr(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_IntToStr",
            display_name="Int to String",
            description="Converts a number to a string.",
            category="Sage Utils/text",
            inputs=[
                io.Int.Input("num", default=0)
            ],
            outputs=[
                io.String.Output("str")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        num = kwargs.get("num", 0)
        return io.NodeOutput(str(num))

class Sage_FloatToStr(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_FloatToStr",
            display_name="Float to String",
            description="Converts a float to a string.",
            category="Sage Utils/text",
            inputs=[
                io.Float.Input("num", default=0.0)
            ],
            outputs=[
                io.String.Output("str")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        num = kwargs.get("num", 0.0)
        return io.NodeOutput(f"{num:.2g}")

class SageSetWildcardText(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="SageSetWildcardText",
            display_name="Set Wildcard Text",
            description="Loads user defined wildcard from the wildcards directory, and applies them to any wildcards in the text.",
            category="Sage Utils/text",
            inputs=[
                io.String.Input("str_input", display_name="str", force_input=False, dynamic_prompts=True, multiline=True),
                io.Int.Input("seed", default=0, min=0, max=2**32-1, step=1),
                io.Boolean.Input("clean", default=False),
                io.String.Input("prefix", force_input=True, multiline=True, optional=True),
                io.String.Input("suffix", force_input=True, multiline=True, optional=True)
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
            category="Sage Utils/text",
            is_output_node=True,
            inputs=[
                io.AnyType.Input("any")
            ],
            outputs=[
                io.String.Output("str")
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
        
        return io.NodeOutput(str_val, ui={"text": str_val})
    #{ "ui": {"text": str}, "result" : (str,) }

class Sage_TextSubstitution(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_TextSubstitution",
            display_name="Text Substitution",
            description="Substitutes the placeholders in the text with the provided strings. The placeholders use the specified delimiter (default $) followed by str_1, str_2, etc. based on the number of connected inputs. The prefix and suffix are added to the final result.",
            category="Sage Utils/text",
            inputs=[
                io.String.Input("text", default="", multiline=True),
                io.String.Input("delimiter", default="$"),
                io.String.Input("prefix", force_input=True, multiline=True, optional=True),
                io.String.Input("suffix", force_input=True, multiline=True, optional=True)
            ],
            outputs=[
                io.String.Output("result")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        text = kwargs.get("text", "")
        delimiter = kwargs.get("delimiter", "$")
        prefix = kwargs.get("prefix", "")
        suffix = kwargs.get("suffix", "")
        
        # Build substitution dictionary from dynamic inputs
        sub_dict = {}
        
        # Extract str_X inputs from kwargs
        for key, value in kwargs.items():
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
            category="Sage Utils/text",
            is_output_node=True,
            inputs=[
                io.Combo.Input("filename", options=notes_files)
            ],
            outputs=[
                io.String.Output("content")
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

class Sage_SetText(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_SetText",
            display_name="Set Text",
            description="Sets some text.",
            category="Sage Utils/text",
            inputs = [
                io.String.Input("str", force_input = False, dynamic_prompts = False, multiline = True),
                io.String.Input("prefix", force_input = True, multiline = True, optional=True),
                io.String.Input("suffix", force_input = True, multiline = True, optional=True)
            ],
            outputs = [
                io.String.Output("str_out")
            ],
        )
    @classmethod
    def execute(cls, **kwargs):
        str = kwargs.get("str", "")
        prefix = kwargs.get("prefix", "")
        suffix = kwargs.get("suffix", "")

        return io.NodeOutput(f"{prefix or ''}{str}{suffix or ''}")

class Sage_SetTextWithInt(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_SetTextWithInt",
            display_name="Set Text With Int",
            description="Sets some text and adds a number at the end.",
            category="Sage Utils/text",
            inputs = [
                io.String.Input("str", force_input = False, dynamic_prompts = False, multiline = True),
                io.String.Input("prefix", force_input = True, multiline = True, optional=True),
                io.String.Input("suffix", force_input = True, multiline = True, optional=True),
                io.Int.Input("number", force_input = False)
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
        number = kwargs.get("number", 0)

        return io.NodeOutput(f"{prefix or ''}{str}{suffix or ''}{number or ''}")

class Sage_TextSwitch(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_TextSwitch",
            display_name="Text Switch",
            description="Passes the text if active is true, otherwise passes an empty string.",
            category="Sage Utils/text",
            inputs=[
                io.String.Input("str", force_input=True, multiline=True),
                io.Boolean.Input("active", default=True)
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
            category="Sage Utils/text",
            inputs=[
                io.String.Input("str", force_input=True, multiline=True)
            ],
            outputs=[
                io.String.Output("cleaned_string", display_name="cleaned string")
            ]
        )

    @classmethod
    def execute(cls, **kwargs):
        str = kwargs.get("str", "")
        return io.NodeOutput(clean_text(str))

class Sage_PonyPrefix(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_PonyPrefix",
            display_name="Pony Prefix",
            description="Generates a prefix for pony-related content.",
            category="Sage Utils/text",
            inputs=[
                io.Boolean.Input("add_score", default=False),
                io.Int.Input("score_start", display_name="Score Start", default=9),
                io.Int.Input("score_end", display_name="Score End", default=4),
                io.Combo.Input("rating", default="none", options=["none", "safe", "questionable", "explicit"]),
                io.Combo.Input("source", default="none", options=["none", "pony", "furry", "anime", "cartoon", "3d", "western", "comic", "monster"])
            ],
            outputs=[
                io.String.Output("str_out", display_name="string")
            ]
        )

    @classmethod
    def execute(cls, **kwargs):
        add_score = kwargs.get("add_score", False)
        rating = kwargs.get("rating", "none")
        source = kwargs.get("source", "none")
        score_start = kwargs.get("score_start", 9)
        score_end = kwargs.get("score_end", 4)
        
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
        return io.NodeOutput(prefix)

pony_strings = ["aav", "aax", "aba", "aca", "acb", "acl", "acm", "acs", "aee", "aef", "aek", "aer", "aet", "aeu", "aew", "aex", "aey", "aff", "aga", "agi", "ago", "ahk", "ahl", "ahz", "aij", "ain", "aiu", "ajm", "aju", "ajy", "akd", "ake", "aki", "akk", "akm", "akr", "aku", "ali", "alp", "amu", "ana", "ani", "anu", "aoa", "aob", "aoj", "aov", "aox", "aoy", "api", "apm", "apo", "aqe", "aqg", "aqu", "aqx", "arb", "aro", "asa", "asm", "asn", "aso", "aua", "aur", "auv", "awd", "awf", "awm", "awv", "axp", "ayb", "ayl", "ayp", "ayq", "ayv", "ayw", "ayy", "aze", "azv", "baf", "bbq", "bcg", "bdc", "bdr", "bem", "bfb", "bfg", "bfq", "bfu", "bfv", "bgf", "bgk", "bgn", "bgv", "bha", "bhb", "bhl", "bhr", "bhz", "bif", "bih", "bim", "bip", "biy", "bjp", "bke", "bkm", "bks", "bku", "bkx", "bna", "bnp", "bnv", "bol", "bom", "bor", "bou", "bpb", "bpc", "bpw", "bpx", "brd", "brk", "brl", "brn", "brp", "brr", "brs", "brw", "brx", "bry", "brz", "bse", "bsl", "bsv", "bub", "bur", "bvk", "bvm", "bvq", "bwf", "bwl", "bwt", "bwu", "bwy", "bxh", "bys", "bzi", "bzl", "bzm", "cad", "cak", "cbr", "cbu", "cch", "cdr", "cds", "cgv", "chl", "ciu", "cle", "cln", "cly", "coh", "coi", "coy", "coz", "crb", "crr", "csb", "csf", "csz", "cte", "cwn", "cxd", "cxg", "cxh", "cxl", "cxw", "cxz", "cyq", "cyu", "czi", "dap", "dbg", "dbj", "dbu", "dbw", "dcd", "dce", "dch", "dck", "ddb", "ddk", "ddp", "deh", "dfd", "dfe", "dfk", "dfm", "dfo", "dhg", "dhl", "dih", "dit", "dja", "djv", "dkd", "dkg", "dki", "dko", "dkr", "dks", "dkt", "dku", "dkv", "dkw", "dky", "dlv", "dmb", "dmf", "dmg", "dmj", "dmk", "dmp", "dnw", "dpa", "dpb", "dpc", "dpf", "dph", "dpj", "dpk", "dpn", "dpo", "dpz", "dsh", "dsk", "dso", "dtb", "dtc", "dtd", "dth", "dtt", "dtu", "dtv", "dty", "dtz", "dvs", "dwc", "dwn", "dww", "dwx", "dwy", "dxo", "dxs", "dxv", "dyu", "dyv", "dza", "dze", "dze", "ebo", "ebp", "ebu", "efk", "egb", "egb", "egk", "egv", "egx", "ehb", "ehf", "ehh", "ehr", "ehx", "ehz", "eim", "ejt", "eka", "eke", "eki", "eky", "ela", "ema", "emc", "eoa", "eob", "eod", "eou", "eov", "eoy", "eqb", "eqc", "eqg", "eqr", "eqt", "eti", "euk", "eum", "evg", "ewi", "ewo", "ewu", "ewy", "exl", "eza", "ezo", "ezy", "fai", "fay", "fbg", "fbu", "fbv", "fbw", "fdv", "fdw", "fdz", "fei", "fem", "fey", "ffs", "fgd", "fgk", "fgq", "fgv", "fgz", "fhb", "fhl", "fhy", "fii", "fjt", "fju", "fjv", "fjx", "fke", "fkm", "fku", "fkw", "fla", "fln", "fpb", "fpw", "fpx", "fpz", "fqx", "fru", "frv", "frw", "fsb", "fsd", "fsf", "fso", "fsp", "fsv", "fvb", "fvd", "fvm", "fvn", "fvs", "fvv", "fvx", "fwh", "fwt", "fwx", "fwy", "fxc", "fxd", "fxv", "fyu", "fyx", "fyy", "fzj", "fzl", "fzm", "fzv", "fzw", "gad", "gaf", "gar", "gax", "gbu", "gcd", "gcg", "gch", "gcx", "gdr", "gea", "ght", "gjt", "gjv", "gjw", "gkb", "gkr", "gmq", "gmz", "goj", "gom", "gor", "gou", "gpc", "gpj", "gpn", "gpo", "gpw", "gpx", "grb", "grp", "grt", "gsb", "gsf", "gsh", "gsu", "gtv", "gtz", "gvb", "gvt", "gwg", "gwh", "gwl", "gwm", "gwt", "gwv", "gwy", "gwz", "gxh", "gxm", "gyy", "gzl", "gzm", "gzr", "gzw", "hag", "hai", "haj", "haz", "hbz", "hcd", "hch", "hda", "hdr", "hep", "hga", "hgt", "hgv", "hij", "hik", "hiq", "hiu", "hjt", "hka", "hke", "hki", "hku", "hlg", "hlk", "hll", "hlt", "hlu", "hmj", "hmp", "hna", "hnj", "hns", "hnu", "hpb", "hpw", "hpx", "hqr", "hsk", "hsn", "htm", "htv", "hua", "hui", "hvi", "hvy", "hwa", "hwd", "hwh", "hwj", "hwl", "hwu", "hwv", "hwz", "hxh", "hya", "hzj", "hzl", "hzm", "hzt", "iao", "iaw", "ibw", "idz", "ieb", "iee", "iel", "iew", "ifl", "iga", "igh", "igo", "igu", "iha", "ihb", "ihc", "ihh", "ihl", "iho", "ihp", "ihr", "ihv", "ihw", "ihz", "iia", "iim", "iin", "iio", "iiy", "ijb", "ijd", "ije", "ijg", "ijh", "iji", "ijk", "ijl", "ijm", "ijp", "ijq", "ijs", "ijv", "ijw", "ijx", "ijy", "ijz", "ikf", "ikm", "ikp", "iku", "iky", "ilb", "ilg", "ilp", "ilr", "ima", "imf", "imo", "inc", "ior", "ipi", "iqt", "iri", "iro", "iru", "iry", "ito", "iuc", "iud", "iue", "iui", "iuk", "iun", "ivh", "ivm", "iwg", "iwj", "iwl", "iwo", "iwp", "iwt", "iwu", "iwv", "iww", "iwy", "ixb", "ixe", "ixz", "iyb", "iyi", "iyo", "iyu", "jaf", "jah", "jaj", "jap", "jbc", "jbg", "jbj", "jbm", "jcd", "jch", "jcp", "jcy", "jdd", "jdg", "jds", "jel", "jfa", "jfb", "jfe", "jfm", "jfn", "jgd", "jgk", "jgm", "jhp", "jhy", "jio", "jju", "jjv", "jjz", "jke", "jkg", "jki", "jkv", "jkw", "jlk", "jln", "jlv", "jme", "jmf", "jmj", "jms", "jmv", "jnj", "jnl", "jpo", "jpw", "jpx", "jqr", "jrm", "jrn", "jrq", "jru", "jsf", "jsm", "jso", "jst", "jsv", "jtj", "jtm", "jtv", "juh", "jui", "jun", "jvb", "jvi", "jvj", "jvm", "jvn", "jvs", "jwh", "jwl", "jwt", "jwv", "jww", "jxd", "jxh", "jxm", "jyk", "jza", "jzd", "jze", "jzg", "jzj", "jzl", "jzm", "jzp", "kab", "kcd", "kch", "kdg", "kdk", "kdr", "kds", "kga", "kgd", "kgq", "kgv", "kgw", "khq", "kib", "kig", "kih", "kjt", "kjw", "klg", "kll", "klm", "kln", "klo", "kmj", "kmp", "kmq", "kmu", "kmw", "kmz", "kna", "koi", "koo", "kou", "kpb", "kpl", "kpm", "kpw", "kqr", "kqx", "ksb", "ksd", "ksf", "ksg", "ksh", "kuh", "kuu", "kvk", "kvl", "kvm", "kvx", "kwl", "kws", "kwv", "kwy", "kxf", "kxg", "kxl", "kxm", "kyg", "kyy", "kzf", "kzg", "kzl", "kzm", "kzr", "kzs", "kzt", "kzw", "lap", "lbi", "lbj", "lbk", "lbo", "lbp", "lbq", "lbu", "lbv", "lbw", "lcf", "lcm", "lcn", "lcp", "lcv", "ldu", "ldv", "lek", "lfh", "lgu", "lgv", "lhb", "lhc", "lhh", "lhy", "lia", "ljw", "lkb", "lkf", "lkg", "lkr", "llq", "lmb", "lml", "lmx", "lmy", "lmz", "lnf", "lnh", "lnp", "lnq", "lnv", "lnw", "loi", "lox", "lpb", "lpc", "lpm", "lpn", "lpt", "lpw", "lpx", "lqf", "lql", "lqx", "lrl", "lru", "lsc", "lsf", "lte", "ltr", "ltv", "lus", "lux", "luz", "lvm", "lvu", "lwb", "lwh", "lwl", "lwn", "lwq", "lwu", "lwy", "lwz", "lxb", "lxh", "lym", "lyn", "lyr", "lzg", "lzj", "lzl", "lzt", "lzy", "lzz", "mbb", "mbg", "mbo", "mdf", "mdg", "mdh", "mdl", "mdo", "mdr", "mdv", "mdw", "met", "mey", "mha", "mhb", "mhf", "mhg", "mhj", "mhk", "mhp", "mhv", "mhx", "mhy", "mii", "mio", "mjb", "mjm", "mjy", "mkb", "mkg", "mkl", "mkx", "mlx", "mmo", "mmr", "moc", "mpa", "mpf", "mph", "mpj", "mpk", "mpl", "mpn", "mpq", "mpr", "mpt", "mpu", "mpv", "mpw", "mpz", "mru", "msh", "msy", "mtd", "muh", "mui", "mul", "mup", "mur", "muu", "muy", "mwb", "mwf", "mwi", "mwn", "mwq", "mwt", "mwz", "mxj", "mxu", "myr", "myu", "mzg", "nan", "nar", "nax", "nbg", "nbi", "ncb", "ncc", "ncd", "nch", "ncl", "ncp", "ncv", "ncx", "nda", "ndr", "ndx", "nev", "nfd", "ngv", "nhd", "nhk", "nhp", "nhu", "nhv", "nhz", "nia", "nie", "nii", "nin", "nir", "nis", "niu", "nke", "nkf", "nki", "nkk", "nko", "nku", "nkv", "nkw", "nlo", "nlv", "nmb", "nmp", "nmu", "nmz", "nna", "nox", "npb", "npn", "npw", "npx", "nqr", "nqx", "nrf", "nrg", "nrh", "nsb", "nsc", "ntd", "nto", "nts", "ntu", "ntv", "ntz", "nvg", "nvi", "nvj", "nvk", "nvl", "nvo", "nvu", "nvv", "nwm", "nwn", "nwy", "nyi", "nyj", "nyk", "nyp", "nyr", "nyy", "nzb", "nzo", "oaa", "oat", "oav", "oax", "obo", "obu", "oca", "ode", "odh", "odk", "odl", "odp", "odr", "oee", "oel", "oey", "ofa", "ofp", "oge", "ogf", "ogk", "ogl", "ogr", "ogv", "oha", "ohg", "ohv", "ohw", "oia", "oib", "oih", "oii", "oim", "oip", "oir", "oix", "ojb", "ojn", "ojt", "ojv", "ojw", "oka", "okf", "olu", "ome", "omi", "omo", "omu", "omv", "onz", "ooh", "oou", "oov", "opb", "opg", "opk", "opl", "opq", "opv", "opw", "orh", "ori", "ose", "ota", "ott", "otv", "oue", "owb", "owf", "owg", "owh", "owi", "owz", "oxz", "oya", "oyj", "oym", "oyq", "oyu", "oyv", "oyy", "oyz", "oza", "ozo", "paf", "pag", "par", "pbc", "pbi", "pbv", "pbw", "pcd", "pdg", "pdk", "pdl", "pdn", "pdo", "pgm", "pgw", "pha", "phy", "pjy", "pkm", "pku", "pln", "pme", "pmj", "pmk", "pml", "pmp", "pnf", "pon", "poo", "ppp", "pri", "psf", "psm", "psp", "ptj", "pvo", "pvs", "pwh", "pwl", "pwn", "pwt", "pwy", "pxg", "pxh", "pxo", "pyb", "pyh", "pyq", "pyy", "pyz", "pzl", "pzm", "pzp", "pzw", "qag", "qak", "qar", "qaw", "qaz", "qbg", "qbu", "qbv", "qbw", "qbx", "qcd", "qch", "qci", "qcq", "qcy", "qcz", "qdc", "qdg", "qdk", "qdl", "qdr", "qgk", "qgm", "qgq", "qgs", "qgv", "qgy", "qgz", "qha", "qhb", "qhh", "qhp", "qhr", "qhy", "qhz", "qia", "qji", "qjl", "qjt", "qju", "qjv", "qjw", "qjx", "qjy", "qkp", "qkr", "qlh", "qlj", "qlt", "qmj", "qml", "qmp", "qmu", "qnj", "qob", "qoc", "qoe", "qoy", "qoz", "qpb", "qpp", "qpw", "qpx", "qqf", "qqr", "qqt", "qqv", "qqx", "qri", "qrj", "qrk", "qrp", "qru", "qsf", "qsv", "qtj", "qvj", "qvn", "qwg", "qwh", "qwl", "qwn", "qwt", "qwu", "qwv", "qwy", "qxh", "qxm", "qxq", "qxs", "qym", "qyp", "qyt", "qzl", "qzm", "qzo", "qzt", "rak", "rbh", "rbi", "rbj", "rbm", "rbq", "rbv", "rbw", "rbx", "rbz", "rcd", "rcf", "rch", "rea", "rek", "rga", "rgx", "rha", "rhc", "rhh", "rhn", "rhv", "riu", "rjg", "rjt", "rjy", "rjz", "rkf", "rkg", "rkq", "rkx", "rmv", "roc", "rou", "rov", "rpw", "rpy", "rpz", "rra", "rrg", "rsd", "rsl", "rsn", "rss", "rui", "rup", "rwy", "rxb", "rxg", "rxh", "rxj", "rxk", "rxw", "rxz", "ryb", "ryn", "rys", "rza", "rzj", "rzl", "rzm", "sae", "saz", "sbk", "sbl", "sdr", "seb", "seu", "sfv", "sfw", "sfy", "sgh", "sgy", "sha", "shq", "sht", "shu", "sid", "sij", "siu", "sjb", "sjc", "sjd", "sje", "sjf", "sjg", "sjh", "sji", "sjj", "sjk", "sjl", "sjm", "sjp", "sjq", "sjs", "sjt", "sju", "sjv", "sjw", "sjx", "sjy", "sjz", "skd", "sko", "sku", "slu", "sme", "smf", "smg", "smh", "smj", "smk", "smk", "sml", "smn", "smp", "smr", "smv", "smz", "sog", "soh", "soi", "soj", "sot", "sou", "spe", "sph", "srf", "srg", "srn", "srr", "srs", "sru", "srv", "srx", "ssp", "stj", "stk", "sud", "swf", "swg", "swl", "sww", "syn", "syu", "szo", "szw", "taj", "tal", "tat", "tcg", "tcj", "tcl", "tcv", "tdc", "tdj", "tdr", "tds", "tdz", "tet", "tfv", "tgt", "thn", "tir", "tiv", "tjt", "tju", "tke", "tkw", "tle", "tlv", "tmu", "tnb", "tnj", "tnl", "tnn", "tnp", "tnr", "tnu", "tnv", "tnw", "tpa", "tpb", "tpc", "tpn", "tpw", "tpx", "tqx", "tsu", "ttp", "tvg", "tvu", "tvx", "twb", "twi", "twu", "tww", "tyb", "tyr", "tyv", "uaa", "uab", "uag", "uai", "uan", "uao", "uap", "uar", "uaw", "uaz", "ube", "ubg", "ubj", "ubk", "ubv", "ubw", "uca", "uch", "uco", "ucs", "udr", "uds", "uea", "uee", "uef", "ufa", "ufb", "ufd", "ufg", "ufo", "ufs", "ufv", "ufw", "ufy", "uga", "ugu", "ugy", "uha", "uhf", "uhi", "uhl", "uhp", "uhr", "uhy", "uie", "uim", "uio", "uip", "uiw", "uix", "ujf", "ujg", "uji", "ujj", "ujn", "ujs", "ujt", "uju", "ujw", "ujx", "ujy", "uks", "ula", "ulb", "ulc", "ulg", "ulh", "ulj", "ulk", "ulm", "uln", "ulp", "ulq", "ulr", "uls", "ulv", "ulw", "ulx", "ulz", "umb", "ume", "umf", "umh", "umj", "umk", "uml", "umn", "umo", "ump", "umr", "ums", "umv", "umx", "umy", "uno", "uob", "uoe", "uog", "uop", "uou", "uov", "uoy", "uoz", "upl", "uqa", "uqb", "uqc", "uqi", "uqt", "uqx", "ura", "urd", "uru", "usu", "utu", "uua", "uub", "uuc", "uud", "uue", "uuf", "uuh", "uui", "uuk", "uum", "uun", "uuq", "uva", "uvb", "uvd", "uvi", "uvm", "uvo", "uvs", "uvt", "uvy", "uwe", "uwh", "uwl", "uwo", "uwp", "uws", "uws", "uwt", "uwy", "uxd", "uxi", "uyd", "uye", "uyf", "uym", "uyz", "uzo", "uzu", "uzv", "uzw", "vag", "var", "vbb", "vbg", "vbi", "vbm", "vbu", "vcd", "vch", "vcv", "vdc", "vdl", "vdq", "vdr", "ven", "vew", "vex", "vey", "vfc", "vfe", "vgf", "vgo", "vgv", "vgx", "vgy", "vhb", "vhr", "vhv", "vhy", "vim", "viv", "vix", "vjb", "vjt", "vke", "vlh", "vlj", "vln", "vlv", "vmj", "vml", "vmz", "vna", "voc", "vpb", "vph", "vpw", "vrj", "vrn", "vrv", "vsh", "vso", "vtd", "vtv", "vud", "vui", "vuj", "vuk", "vum", "vun", "vvi", "vwh", "vwl", "vxh", "vxi", "vxv", "vyv", "vzl", "vzm", "vzo", "vzp", "wau", "wav", "wba", "wbi", "wbs", "wbu", "wcd", "wcy", "wda", "wdr", "wew", "wfa", "wfg", "wfj", "wfk", "wfm", "wfw", "wfy", "wgf", "wgg", "wgi", "wgm", "wgs", "wgv", "wha", "wiz", "wjd", "wjt", "wju", "wjv", "wke", "wko", "wkx", "wli", "wlk", "wlt", "wlv", "wlz", "wma", "wmb", "wmf", "wmg", "wmj", "wmk", "wmp", "wms", "wmv", "wmw", "wnp", "wnv", "wnw", "woi", "woj", "wou", "wov", "woy", "wpa", "wpb", "wpc", "wpf", "wpl", "wpo", "wpp", "wps", "wpt", "wpw", "wpx", "wqb", "wqr", "wrl", "wry", "wsb", "wsf", "wsn", "wsp", "wsv", "wtd", "wti", "wtr", "wtv", "wtw", "wuk", "wun", "wva", "wvb", "wve", "wvi", "wvy", "wwd", "wwn", "wwv", "wwy", "wxg", "wxh", "wxi", "wxj", "wxr", "wxu", "wxw", "wxz", "wyy", "wzg", "wzi", "wzm", "wzp", "wzp", "wzq", "wzu", "wzw", "wzx", "xag", "xar", "xaz", "xbi", "xbm", "xbu", "xbw", "xcd", "xch", "xcq", "xdr", "xds", "xfy", "xgm", "xgq", "xhb", "xhh", "xie", "xih", "xii", "xij", "xik", "xio", "xiq", "xiu", "xiv", "xjw", "xkg", "xkk", "xkl", "xkq", "xku", "xlh", "xlv", "xlw", "xlx", "xmj", "xob", "xoi", "xoy", "xpb", "xph", "xpk", "xpn", "xpw", "xqx", "xrj", "xrl", "xru", "xrw", "xsb", "xsd", "xsh", "xsl", "xtd", "xtj", "xuc", "xui", "xuo", "xvj", "xwg", "xwj", "xwp", "xwt", "xwu", "xwv", "xwy", "xxb", "xxi", "xyu", "xyy", "xzb", "xzf", "xzi", "xzj", "xzl", "xzo", "xzp", "xzv", "yaa", "yag", "yai", "yam", "ych", "ydc", "yeb", "yej", "yeq", "yga", "ygn", "ygq", "ygr", "ygv", "ygz", "yha", "yhb", "yhy", "yia", "yib", "yik", "yiu", "yiy", "yjt", "yjw", "yjy", "yku", "yle", "ylv", "ymp", "yne", "ynn", "ynr", "yoa", "yob", "yoh", "yok", "ypn", "ypw", "ypx", "ypy", "yqx", "yrl", "yrm", "yru", "ysu", "yte", "ytj", "ytm", "ytq", "ytr", "ytv", "yuh", "yui", "yuj", "yvj", "yvm", "yvn", "ywh", "ywt", "yxh", "yyd", "yyg", "yyi", "yyp", "yyr", "yyu", "yyz", "yza", "yzy", "zab", "zac", "zay", "zbg", "zbi", "zbj", "zbw", "zcd", "zcx", "zdg", "zdm", "zds", "zeb", "zei", "zeu", "zfz", "zgd", "zgg", "zgm", "zgq", "zgv", "zhp", "zhr", "zhy", "zib", "zix", "ziy", "ziz", "zjt", "zju", "zjw", "zke", "zkf", "zky", "zlv", "zmb", "zmj", "zmt", "zmv", "zna", "znw", "znz", "zou", "zpa", "zpx", "zqx", "zri", "zrj", "zro", "zrp", "zru", "zrw", "zsb", "zsh", "ztv", "zue", "zun", "zvj", "zvm", "zvn", "zvu", "zwt", "zwv", "zxv", "zzg", "zzj", "zzk", "zzp", "zzr"]

class Sage_PonyStyle(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_PonyStyle",
            display_name="Pony Style",
            description="Adds the chosen three letter artist styles from Pony v6.",
            category="Sage Utils/text",
            
            inputs=[
                io.MultiCombo.Input("style", pony_strings, chip=True, placeholder="Pony Style")
            ],
            outputs=[
                io.String.Output("styled_text")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        style = kwargs.get("style", [])
        return io.NodeOutput(", ".join(style))

class Sage_SaveText(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_SaveText",
            display_name="Save Text",
            description="Saves the text to a file.",
            category="Sage Utils/text",
            inputs=[
                io.String.Input("filename_prefix", default="ComfyUI_Text", tooltip="The prefix for the file to save. This may include formatting information such as %date:yyyy-MM-dd% to include values from nodes."),
                io.String.Input("file_extension", default="txt", tooltip="The file extension to use for the saved file."),
                io.String.Input("text", force_input=True, multiline=True),
                io.Int.Input("batch_size", default=1, tooltip="The number of files to save.")
            ],
            outputs=[
                io.String.Output("filepath")
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

class Sage_JoinText(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_JoinText",
            display_name="Join Text",
            description="Joins two strings with a separator.",
            category="Sage Utils/text",
            inputs=[
                io.String.Input("separator", default=", "),
                io.Boolean.Input("add_separator_to_end", default=False, tooltip="Add separator to the end of the joined string."),
                io.String.Input("str1", multiline=True),
                io.String.Input("str2", multiline=True)
            ],
            outputs=[
                io.String.Output("str")
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
            display_name="Triple Join Text",
            description="Joins three strings with a separator.",
            category="Sage Utils/text",
            inputs=[
                io.String.Input("separator", default=", "),
                io.Boolean.Input("add_separator_to_end", default=False, tooltip="Add separator to the end of the joined string."),
                io.String.Input("str1", multiline=True),
                io.String.Input("str2", multiline=True),
                io.String.Input("str3", multiline=True)
            ],
            outputs=[
                io.String.Output("str")
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
            category="Sage Utils/text",
            inputs=[
                io.String.Input("text", multiline=True),
                io.Int.Input("seed", default=0)
            ],
            outputs=[
                io.String.Output("random_line")
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
            category="Sage Utils/text",
            inputs=[
                io.String.Input("text", multiline=True),
                io.Int.Input("line_number", default=0, min=0)
            ],
            outputs=[
                io.String.Output("selected_line")
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

class Sage_TextWeight(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_TextWeight",
            display_name="Text Weight",
            description="Applies a weight to a text string.",
            category="Sage Utils/text",
            inputs=[
                io.String.Input("text", multiline=True),
                io.Float.Input("weight", default=1.0, min=-10.0, max=10.0, step=0.05),
                io.String.Input("separator", default=", ")
            ],
            outputs=[
                io.String.Output("weighted_text")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        text = kwargs.get("text", "")
        weight = kwargs.get("weight", 1.0)
        separator = kwargs.get("separator", ", ")
        
        return io.NodeOutput(f"({text}:{weight:.2g}){separator}")

# ============================================================================
# PLACEHOLDER NODES - NOT YET FULLY IMPLEMENTED
# ============================================================================
# These are placeholder implementations. The inputs/outputs match the original
# v1 nodes, but the execute methods need proper implementation.

class Sage_PromptText(io.ComfyNode):
    """PLACEHOLDER: Combines a system prompt and a user prompt into a single prompt."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_PromptText",
            display_name="Prompt Text (Lumina 2)",
            description="PLACEHOLDER: Combines a system prompt and a user prompt into a single prompt, with <Prompt Start> between them.",
            category="Sage Utils/text/specialized",
            inputs=[
                io.String.Input("system", force_input=True, multiline=True),
                io.String.Input("prompt", force_input=True, multiline=True)
            ],
            outputs=[
                io.String.Output("combined_prompt")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from text.py
        system = kwargs.get("system", "")
        prompt = kwargs.get("prompt", "")
        combined_prompt = f"{system}{PROMPT_START}{prompt}"
        return io.NodeOutput(combined_prompt)

class Sage_SystemPrompt(io.ComfyNode):
    """PLACEHOLDER: Picks the system prompt based on the selected option."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_SystemPrompt",
            display_name="System Prompt (Lumina 2)",
            description="PLACEHOLDER: Picks the system prompt based on the selected option.",
            category="Sage Utils/text/specialized",
            inputs=[
                io.Combo.Input("system", options=list(LUMINA2_SYSTEM_PROMPTS_V2.keys()), default="superior", tooltip=LUMINA2_SYSTEM_PROMPT_TIP)
            ],
            outputs=[
                io.String.Output("system_prompt")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from text.py
        system = kwargs.get("system", "superior")
        ret = LUMINA2_SYSTEM_PROMPTS_V2.get(system, "")
        return io.NodeOutput(ret)

class Sage_PonyStyleCluster(io.ComfyNode):
    """PLACEHOLDER: Creates a style cluster string for pony prompts."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_PonyStyleCluster",
            display_name="Pony Style Cluster",
            description="PLACEHOLDER: Creates a style cluster string for pony prompts based on the given style cluster number.",
            category="Sage Utils/text/pony",
            inputs=[
                io.Int.Input("style_cluster", default=1, min=1, max=2048, step=1)
            ],
            outputs=[
                io.String.Output("style_cluster_text")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from text.py
        style_cluster = kwargs.get("style_cluster", 1)
        return io.NodeOutput(f"style_cluster_{style_cluster}, ")

class Sage_PonySource(io.ComfyNode):
    """PLACEHOLDER: Creates a source string for pony prompts."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_PonySource",
            display_name="Pony Source",
            description="PLACEHOLDER: Creates a source string for pony prompts based on the given source.",
            category="Sage Utils/text/pony",
            inputs=[
                io.Combo.Input("source", options=PONY_SOURCE, default="none")
            ],
            outputs=[
                io.String.Output("source_text")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from text.py
        source = kwargs.get("source", "none")
        if source == "none":
            return io.NodeOutput("")
        else:
            return io.NodeOutput(f"source_{source}, ")

class Sage_PonyRatingv7(io.ComfyNode):
    """PLACEHOLDER: Creates a rating string for pony prompts (v7 style)."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_PonyRatingv7",
            display_name="Pony Rating (v7)",
            description="PLACEHOLDER: Creates a rating string for pony prompts based on the given rating. (v7 style)",
            category="Sage Utils/text/pony",
            inputs=[
                io.Combo.Input("rating", options=PONY_V7_RATING, default="none")
            ],
            outputs=[
                io.String.Output("rating_text")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from text.py
        rating = kwargs.get("rating", "none")
        if rating == "none":
            return io.NodeOutput("")
        else:
            return io.NodeOutput(f"rating_{rating}, ")

class Sage_PonyRatingv6(io.ComfyNode):
    """PLACEHOLDER: Creates a rating string for pony prompts (v6 style)."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_PonyRatingv6",
            display_name="Pony Rating (v6)",
            description="PLACEHOLDER: Creates a rating string for pony prompts based on the given rating. (v6 style)",
            category="Sage Utils/text/pony",
            inputs=[
                io.Combo.Input("rating", options=PONY_V6_RATING, default="none")
            ],
            outputs=[
                io.String.Output("rating_text")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from text.py
        rating = kwargs.get("rating", "none")
        if rating == "none":
            return io.NodeOutput("")
        else:
            return io.NodeOutput(f"rating_{rating}, ")

class Sage_PonyScore(io.ComfyNode):
    """PLACEHOLDER: Creates a score string for pony prompts."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_PonyScore",
            display_name="Pony Score",
            description="PLACEHOLDER: Creates a score string for pony prompts based on the given start and end scores.",
            category="Sage Utils/text/pony",
            inputs=[
                io.Int.Input("score_start", default=9, min=0, max=9, step=1),
                io.Int.Input("score_end", default=4, min=0, max=9, step=1),
                io.Boolean.Input("up_to", default=False, tooltip="If true, adds '_up' to the score string, except for score_9. (v6 uses up, v7 doesn't)")
            ],
            outputs=[
                io.String.Output("score_text")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        # TODO: Implement full logic from text.py
        score_start = kwargs.get("score_start", 9)
        score_end = kwargs.get("score_end", 4)
        up_to = kwargs.get("up_to", False)
        
        score_range = range(score_start, score_end - 1, -1)
        score_text = ""
        for s in score_range:
            if s == 9:
                score_text += f"score_{s}, "
            elif s < 9:
                score_text += f"score_{s}{'_up' if up_to else ''}, "
        return io.NodeOutput(score_text)

# ============================================================================

class Sage_HiDreamE1_Instruction(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_HiDreamE1_Instruction",
            display_name="HiDream E1 Instruction",
            description="Generates a prompt for HiDream E1 based on the given instruction and description.",
            category="Sage Utils/text",
            inputs=[
                io.String.Input("instruction", multiline=True),
                io.String.Input("description", multiline=True)
            ],
            outputs=[
                io.String.Output("prompt")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        instruction = kwargs.get("instruction", "")
        description = kwargs.get("description", "")
        
        cleaned_instruction = clean_text(instruction)
        cleaned_description = clean_text(description)
        
        if not cleaned_instruction:
            raise ValueError("Instruction cannot be empty.")
        if not cleaned_description:
            raise ValueError("Description cannot be empty.")
        
        if cleaned_instruction and cleaned_instruction[-1] != ".":
            cleaned_instruction += "."
        
        prompt = f"Instruction: {cleaned_instruction}\nDescription: {cleaned_description}"
        
        return io.NodeOutput(prompt)

# Update TEXT_NODES list
TEXT_NODES = [
    Sage_IntToStr,
    Sage_FloatToStr,
    SageSetWildcardText,
    Sage_SetText, 
    Sage_SetTextWithInt, 
    Sage_TextSwitch, 
    Sage_CleanText, 
    Sage_PonyStyle, 
    Sage_PonyPrefix,
    Sage_SaveText,
    Sage_JoinText,
    Sage_TripleJoinText,
    Sage_ViewAnything,
    Sage_TextRandomLine,
    Sage_TextSelectLine,
    Sage_TextSubstitution,
    Sage_TextWeight,
    Sage_HiDreamE1_Instruction,
    Sage_ViewNotes,
    # Placeholder nodes (not fully implemented)
    Sage_PromptText,
    Sage_SystemPrompt,
    Sage_PonyStyleCluster,
    Sage_PonySource,
    Sage_PonyRatingv7,
    Sage_PonyRatingv6,
    Sage_PonyScore
]