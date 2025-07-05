# Text nodes.
# This contains any nodes that are dealing with text, including setting text, joining text, cleaning text, and viewing text.

from __future__ import annotations
from comfy.comfy_types.node_typing import ComfyNodeABC, InputTypeDict, IO

# Import specific utilities instead of wildcard import
from ..utils import (
    clean_text, get_save_file_path,
    sage_wildcard_path,
    path_manager
)

from dynamicprompts.generators import RandomPromptGenerator
from dynamicprompts.wildcards.wildcard_manager import WildcardManager

class SageSetWildcardText(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "optional": {
                "prefix": (IO.STRING, {"defaultInput": True, "multiline": True}),
                "suffix": (IO.STRING, {"defaultInput": True, "multiline": True})
            },
            "required": {
                "str": (IO.STRING, {"forceInput": False, "dynamicPrompts": True, "multiline": True}),
                "seed": (IO.INT, {"defaultInput": False, "default": 0, "min": 0, "max": 2**32-1, "step": 1}),
                "clean": (IO.BOOLEAN, {"defaultInput": False, "default": False})
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
        str = generator.generate(str)[0]

        # Clean the string if requested
        if clean:
            str = clean_text(str)

        return (str,)

class Sage_SetText(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "optional": {
                "prefix": (IO.STRING, {"defaultInput": True, "multiline": True}),
                "suffix": (IO.STRING, {"defaultInput": True, "multiline": True})
            },
            "required": {
                "str": (IO.STRING, {"forceInput": False, "dynamicPrompts": True, "multiline": True})
            }
        }

    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ("str",)

    FUNCTION = "pass_str"

    CATEGORY = "Sage Utils/text"
    DESCRIPTION = "Sets some text."

    def pass_str(self, str, prefix=None, suffix=None) -> tuple[str]:
        return (f"{prefix or ''}{str}{suffix or ''}",)

class Sage_SaveText(ComfyNodeABC):

    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "filename_prefix": (IO.STRING, {"default": "ComfyUI_Text", "tooltip": "The prefix for the file to save. This may include formatting information such as %date:yyyy-MM-dd% to include values from nodes."}),
                "file_extension": (IO.STRING, {"defaultInput": False, "default": "txt", "tooltip": "The file extension to use for the saved file."}),
                "text": (IO.STRING, {"forceInput": True, "multiline": True})
            }
        }

    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ("filepath",)

    FUNCTION = "save_text"

    CATEGORY = "Sage Utils/text"
    DESCRIPTION = "Saves the text to a file."

    def save_text(self, filename_prefix: str, file_extension: str, text: str) -> tuple[str]:
        if file_extension.startswith('.'):
            file_extension = file_extension[1:]
        full_path = get_save_file_path(filename_prefix, file_extension)
        if not full_path:
            raise ValueError("Invalid file path.")

        with open(full_path, 'w', encoding='utf-8') as file:
            file.write(text)

        print(f"Text saved to {full_path}")
        return (full_path,)

class Sage_JoinText(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "separator": (IO.STRING, {"defaultInput": False, "default": ', '}),
                "add_separator_to_end": (IO.BOOLEAN, {"defaultInput": False, "default": False, "tooltip": "Add separator to the end of the joined string."}),
                "str1": (IO.STRING, {"defaultInput": True, "multiline": True}),
                "str2": (IO.STRING, {"defaultInput": True, "multiline": True}),
            }
        }

    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ("str",)

    FUNCTION = "join_str"

    CATEGORY = "Sage Utils/text"
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
                "separator": (IO.STRING, {"defaultInput": False, "default": ', '}),
                "add_separator_to_end": (IO.BOOLEAN, {"defaultInput": False, "default": False, "tooltip": "Add separator to the end of the joined string."}),
                "str1": (IO.STRING, {"defaultInput": True, "multiline": True}),
                "str2": (IO.STRING, {"defaultInput": True, "multiline": True}),
                "str3": (IO.STRING, {"defaultInput": True, "multiline": True})
            }
        }

    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ("str",)

    FUNCTION = "join_str"

    CATEGORY = "Sage Utils/text"
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
                "str": (IO.STRING, {"defaultInput": True, "multiline": True}),
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
        #print(f"Text is '{any}'")
        str = ""
        if isinstance(any, list):
            for t in any:
                str += f"{t}\n"
                #print(f"String is '{t}'")
        else:
            str = any
        #print(f"String is '{str}'")
        return { "ui": {"text": str}, "result" : (str,) }

class Sage_PonyPrefix(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "add_score": (IO.BOOLEAN, {"defaultInput": False}),
                "rating": (["none", "safe", "questionable", "explicit"], {"defaultInput": False}),
                "source": (["none", "pony", "furry", "anime", "cartoon", "3d", "western", "comic", "monster"], {"defaultInput": False}),
            }
        }

    RETURN_TYPES = (IO.STRING,)

    FUNCTION = "create_prefix"
    CATEGORY = "Sage Utils/text"

    def create_prefix(self, add_score, rating, source, prompt=None) -> tuple[str]:
        prefix = "score_9, score_8_up, score_7_up, score_6_up, score_5_up, score_4_up, " if add_score else ""
        prefix += f"source_{source}, " if source != "none" else ""
        prefix += f"rating_{rating}, " if rating != "none" else ""
        return (prefix,)

class Sage_TextWeight(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "text": (IO.STRING, {"defaultInput": True, "multiline": True}),
                "weight": (IO.FLOAT, {"defaultInput": False, "default": 1.0, "min": -10.0, "max": 10.0, "step": 0.05})
            }
        }

    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ("weighted_text",)

    FUNCTION = "weight_text"

    CATEGORY = "Sage Utils/text"
    DESCRIPTION = "Applies a weight to a text string."

    def weight_text(self, text: str, weight: float) -> tuple[str]:
        return (f"({text}:{weight:.2f}),",)

class Sage_HiDreamE1_Instruction(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "instruction": (IO.STRING, {"defaultInput": True, "multiline": True}),
                "description": (IO.STRING, {"defaultInput": True, "multiline": True})
            }
        }

    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ("prompt",)
    
    FUNCTION = "generate_prompt"
    
    CATEGORY = "Sage Utils/text"
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
            print(f"Last character of instruction is '{cleaned_instruction[-1]}'")
            cleaned_instruction += "."

        # Generate the prompt
        prompt = f"Instruction: {cleaned_instruction}\nDescription: {cleaned_description}"

        return (prompt,)


pony_strings = ["aav", "aax", "aba", "aca", "acb", "acl", "acm", "acs", "aee", "aef", "aek", "aer", "aet", "aeu", "aew", "aex", "aey", "aff", "aga", "agi", "ago", "ahk", "ahl", "ahz", "aij", "ain", "aiu", "ajm", "aju", "ajy", "akd", "ake", "aki", "akk", "akm", "akr", "aku", "ali", "alp", "amu", "ana", "ani", "anu", "aoa", "aob", "aoj", "aov", "aox", "aoy", "api", "apm", "apo", "aqe", "aqg", "aqu", "aqx", "arb", "aro", "asa", "asm", "asn", "aso", "aua", "aur", "auv", "awd", "awf", "awm", "awv", "axp", "ayb", "ayl", "ayp", "ayq", "ayv", "ayw", "ayy", "aze", "azv", "baf", "bbq", "bcg", "bdc", "bdr", "bem", "bfb", "bfg", "bfq", "bfu", "bfv", "bgf", "bgk", "bgn", "bgv", "bha", "bhb", "bhl", "bhr", "bhz", "bif", "bih", "bim", "bip", "biy", "bjp", "bke", "bkm", "bks", "bku", "bkx", "bna", "bnp", "bnv", "bol", "bom", "bor", "bou", "bpb", "bpc", "bpw", "bpx", "brd", "brk", "brl", "brn", "brp", "brr", "brs", "brw", "brx", "bry", "brz", "bse", "bsl", "bsv", "bub", "bur", "bvk", "bvm", "bvq", "bwf", "bwl", "bwt", "bwu", "bwy", "bxh", "bys", "bzi", "bzl", "bzm", "cad", "cak", "cbr", "cbu", "cch", "cdr", "cds", "cgv", "chl", "ciu", "cle", "cln", "cly", "coh", "coi", "coy", "coz", "crb", "crr", "csb", "csf", "csz", "cte", "cwn", "cxd", "cxg", "cxh", "cxl", "cxw", "cxz", "cyq", "cyu", "czi", "dap", "dbg", "dbj", "dbu", "dbw", "dcd", "dce", "dch", "dck", "ddb", "ddk", "ddp", "deh", "dfd", "dfe", "dfk", "dfm", "dfo", "dhg", "dhl", "dih", "dit", "dja", "djv", "dkd", "dkg", "dki", "dko", "dkr", "dks", "dkt", "dku", "dkv", "dkw", "dky", "dlv", "dmb", "dmf", "dmg", "dmj", "dmk", "dmp", "dnw", "dpa", "dpb", "dpc", "dpf", "dph", "dpj", "dpk", "dpn", "dpo", "dpz", "dsh", "dsk", "dso", "dtb", "dtc", "dtd", "dth", "dtt", "dtu", "dtv", "dty", "dtz", "dvs", "dwc", "dwn", "dww", "dwx", "dwy", "dxo", "dxs", "dxv", "dyu", "dyv", "dza", "dze", "dze", "ebo", "ebp", "ebu", "efk", "egb", "egb", "egk", "egv", "egx", "ehb", "ehf", "ehh", "ehr", "ehx", "ehz", "eim", "ejt", "eka", "eke", "eki", "eky", "ela", "ema", "emc", "eoa", "eob", "eod", "eou", "eov", "eoy", "eqb", "eqc", "eqg", "eqr", "eqt", "eti", "euk", "eum", "evg", "ewi", "ewo", "ewu", "ewy", "exl", "eza", "ezo", "ezy", "fai", "fay", "fbg", "fbu", "fbv", "fbw", "fdv", "fdw", "fdz", "fei", "fem", "fey", "ffs", "fgd", "fgk", "fgq", "fgv", "fgz", "fhb", "fhl", "fhy", "fii", "fjt", "fju", "fjv", "fjx", "fke", "fkm", "fku", "fkw", "fla", "fln", "fpb", "fpw", "fpx", "fpz", "fqx", "fru", "frv", "frw", "fsb", "fsd", "fsf", "fso", "fsp", "fsv", "fvb", "fvd", "fvm", "fvn", "fvs", "fvv", "fvx", "fwh", "fwt", "fwx", "fwy", "fxc", "fxd", "fxv", "fyu", "fyx", "fyy", "fzj", "fzl", "fzm", "fzv", "fzw", "gad", "gaf", "gar", "gax", "gbu", "gcd", "gcg", "gch", "gcx", "gdr", "gea", "ght", "gjt", "gjv", "gjw", "gkb", "gkr", "gmq", "gmz", "goj", "gom", "gor", "gou", "gpc", "gpj", "gpn", "gpo", "gpw", "gpx", "grb", "grp", "grt", "gsb", "gsf", "gsh", "gsu", "gtv", "gtz", "gvb", "gvt", "gwg", "gwh", "gwl", "gwm", "gwt", "gwv", "gwy", "gwz", "gxh", "gxm", "gyy", "gzl", "gzm", "gzr", "gzw", "hag", "hai", "haj", "haz", "hbz", "hcd", "hch", "hda", "hdr", "hep", "hga", "hgt", "hgv", "hij", "hik", "hiq", "hiu", "hjt", "hka", "hke", "hki", "hku", "hlg", "hlk", "hll", "hlt", "hlu", "hmj", "hmp", "hna", "hnj", "hns", "hnu", "hpb", "hpw", "hpx", "hqr", "hsk", "hsn", "htm", "htv", "hua", "hui", "hvi", "hvy", "hwa", "hwd", "hwh", "hwj", "hwl", "hwu", "hwv", "hwz", "hxh", "hya", "hzj", "hzl", "hzm", "hzt", "iao", "iaw", "ibw", "idz", "ieb", "iee", "iel", "iew", "ifl", "iga", "igh", "igo", "igu", "iha", "ihb", "ihc", "ihh", "ihl", "iho", "ihp", "ihr", "ihv", "ihw", "ihz", "iia", "iim", "iin", "iio", "iiy", "ijb", "ijd", "ije", "ijg", "ijh", "iji", "ijk", "ijl", "ijm", "ijp", "ijq", "ijs", "ijv", "ijw", "ijx", "ijy", "ijz", "ikf", "ikm", "ikp", "iku", "iky", "ilb", "ilg", "ilp", "ilr", "ima", "imf", "imo", "inc", "ior", "ipi", "iqt", "iri", "iro", "iru", "iry", "ito", "iuc", "iud", "iue", "iui", "iuk", "iun", "ivh", "ivm", "iwg", "iwj", "iwl", "iwo", "iwp", "iwt", "iwu", "iwv", "iww", "iwy", "ixb", "ixe", "ixz", "iyb", "iyi", "iyo", "iyu", "jaf", "jah", "jaj", "jap", "jbc", "jbg", "jbj", "jbm", "jcd", "jch", "jcp", "jcy", "jdd", "jdg", "jds", "jel", "jfa", "jfb", "jfe", "jfm", "jfn", "jgd", "jgk", "jgm", "jhp", "jhy", "jio", "jju", "jjv", "jjz", "jke", "jkg", "jki", "jkv", "jkw", "jlk", "jln", "jlv", "jme", "jmf", "jmj", "jms", "jmv", "jnj", "jnl", "jpo", "jpw", "jpx", "jqr", "jrm", "jrn", "jrq", "jru", "jsf", "jsm", "jso", "jst", "jsv", "jtj", "jtm", "jtv", "juh", "jui", "jun", "jvb", "jvi", "jvj", "jvm", "jvn", "jvs", "jwh", "jwl", "jwt", "jwv", "jww", "jxd", "jxh", "jxm", "jyk", "jza", "jzd", "jze", "jzg", "jzj", "jzl", "jzm", "jzp", "kab", "kcd", "kch", "kdg", "kdk", "kdr", "kds", "kga", "kgd", "kgq", "kgv", "kgw", "khq", "kib", "kig", "kih", "kjt", "kjw", "klg", "kll", "klm", "kln", "klo", "kmj", "kmp", "kmq", "kmu", "kmw", "kmz", "kna", "koi", "koo", "kou", "kpb", "kpl", "kpm", "kpw", "kqr", "kqx", "ksb", "ksd", "ksf", "ksg", "ksh", "kuh", "kuu", "kvk", "kvl", "kvm", "kvx", "kwl", "kws", "kwv", "kwy", "kxf", "kxg", "kxl", "kxm", "kyg", "kyy", "kzf", "kzg", "kzl", "kzm", "kzr", "kzs", "kzt", "kzw", "lap", "lbi", "lbj", "lbk", "lbo", "lbp", "lbq", "lbu", "lbv", "lbw", "lcf", "lcm", "lcn", "lcp", "lcv", "ldu", "ldv", "lek", "lfh", "lgu", "lgv", "lhb", "lhc", "lhh", "lhy", "lia", "ljw", "lkb", "lkf", "lkg", "lkr", "llq", "lmb", "lml", "lmx", "lmy", "lmz", "lnf", "lnh", "lnp", "lnq", "lnv", "lnw", "loi", "lox", "lpb", "lpc", "lpm", "lpn", "lpt", "lpw", "lpx", "lqf", "lql", "lqx", "lrl", "lru", "lsc", "lsf", "lte", "ltr", "ltv", "lus", "lux", "luz", "lvm", "lvu", "lwb", "lwh", "lwl", "lwn", "lwq", "lwu", "lwy", "lwz", "lxb", "lxh", "lym", "lyn", "lyr", "lzg", "lzj", "lzl", "lzt", "lzy", "lzz", "mbb", "mbg", "mbo", "mdf", "mdg", "mdh", "mdl", "mdo", "mdr", "mdv", "mdw", "met", "mey", "mha", "mhb", "mhf", "mhg", "mhj", "mhk", "mhp", "mhv", "mhx", "mhy", "mii", "mio", "mjb", "mjm", "mjy", "mkb", "mkg", "mkl", "mkx", "mlx", "mmo", "mmr", "moc", "mpa", "mpf", "mph", "mpj", "mpk", "mpl", "mpn", "mpq", "mpr", "mpt", "mpu", "mpv", "mpw", "mpz", "mru", "msh", "msy", "mtd", "muh", "mui", "mul", "mup", "mur", "muu", "muy", "mwb", "mwf", "mwi", "mwn", "mwq", "mwt", "mwz", "mxj", "mxu", "myr", "myu", "mzg", "nan", "nar", "nax", "nbg", "nbi", "ncb", "ncc", "ncd", "nch", "ncl", "ncp", "ncv", "ncx", "nda", "ndr", "ndx", "nev", "nfd", "ngv", "nhd", "nhk", "nhp", "nhu", "nhv", "nhz", "nia", "nie", "nii", "nin", "nir", "nis", "niu", "nke", "nkf", "nki", "nkk", "nko", "nku", "nkv", "nkw", "nlo", "nlv", "nmb", "nmp", "nmu", "nmz", "nna", "nox", "npb", "npn", "npw", "npx", "nqr", "nqx", "nrf", "nrg", "nrh", "nsb", "nsc", "ntd", "nto", "nts", "ntu", "ntv", "ntz", "nvg", "nvi", "nvj", "nvk", "nvl", "nvo", "nvu", "nvv", "nwm", "nwn", "nwy", "nyi", "nyj", "nyk", "nyp", "nyr", "nyy", "nzb", "nzo", "oaa", "oat", "oav", "oax", "obo", "obu", "oca", "ode", "odh", "odk", "odl", "odp", "odr", "oee", "oel", "oey", "ofa", "ofp", "oge", "ogf", "ogk", "ogl", "ogr", "ogv", "oha", "ohg", "ohv", "ohw", "oia", "oib", "oih", "oii", "oim", "oip", "oir", "oix", "ojb", "ojn", "ojt", "ojv", "ojw", "oka", "okf", "olu", "ome", "omi", "omo", "omu", "omv", "onz", "ooh", "oou", "oov", "opb", "opg", "opk", "opl", "opq", "opv", "opw", "orh", "ori", "ose", "ota", "ott", "otv", "oue", "owb", "owf", "owg", "owh", "owi", "owz", "oxz", "oya", "oyj", "oym", "oyq", "oyu", "oyv", "oyy", "oyz", "oza", "ozo", "paf", "pag", "par", "pbc", "pbi", "pbv", "pbw", "pcd", "pdg", "pdk", "pdl", "pdn", "pdo", "pgm", "pgw", "pha", "phy", "pjy", "pkm", "pku", "pln", "pme", "pmj", "pmk", "pml", "pmp", "pnf", "pon", "poo", "ppp", "pri", "psf", "psm", "psp", "ptj", "pvo", "pvs", "pwh", "pwl", "pwn", "pwt", "pwy", "pxg", "pxh", "pxo", "pyb", "pyh", "pyq", "pyy", "pyz", "pzl", "pzm", "pzp", "pzw", "qag", "qak", "qar", "qaw", "qaz", "qbg", "qbu", "qbv", "qbw", "qbx", "qcd", "qch", "qci", "qcq", "qcy", "qcz", "qdc", "qdg", "qdk", "qdl", "qdr", "qgk", "qgm", "qgq", "qgs", "qgv", "qgy", "qgz", "qha", "qhb", "qhh", "qhp", "qhr", "qhy", "qhz", "qia", "qji", "qjl", "qjt", "qju", "qjv", "qjw", "qjx", "qjy", "qkp", "qkr", "qlh", "qlj", "qlt", "qmj", "qml", "qmp", "qmu", "qnj", "qob", "qoc", "qoe", "qoy", "qoz", "qpb", "qpp", "qpw", "qpx", "qqf", "qqr", "qqt", "qqv", "qqx", "qri", "qrj", "qrk", "qrp", "qru", "qsf", "qsv", "qtj", "qvj", "qvn", "qwg", "qwh", "qwl", "qwn", "qwt", "qwu", "qwv", "qwy", "qxh", "qxm", "qxq", "qxs", "qym", "qyp", "qyt", "qzl", "qzm", "qzo", "qzt", "rak", "rbh", "rbi", "rbj", "rbm", "rbq", "rbv", "rbw", "rbx", "rbz", "rcd", "rcf", "rch", "rea", "rek", "rga", "rgx", "rha", "rhc", "rhh", "rhn", "rhv", "riu", "rjg", "rjt", "rjy", "rjz", "rkf", "rkg", "rkq", "rkx", "rmv", "roc", "rou", "rov", "rpw", "rpy", "rpz", "rra", "rrg", "rsd", "rsl", "rsn", "rss", "rui", "rup", "rwy", "rxb", "rxg", "rxh", "rxj", "rxk", "rxw", "rxz", "ryb", "ryn", "rys", "rza", "rzj", "rzl", "rzm", "sae", "saz", "sbk", "sbl", "sdr", "seb", "seu", "sfv", "sfw", "sfy", "sgh", "sgy", "sha", "shq", "sht", "shu", "sid", "sij", "siu", "sjb", "sjc", "sjd", "sje", "sjf", "sjg", "sjh", "sji", "sjj", "sjk", "sjl", "sjm", "sjp", "sjq", "sjs", "sjt", "sju", "sjv", "sjw", "sjx", "sjy", "sjz", "skd", "sko", "sku", "slu", "sme", "smf", "smg", "smh", "smj", "smk", "smk", "sml", "smn", "smp", "smr", "smv", "smz", "sog", "soh", "soi", "soj", "sot", "sou", "spe", "sph", "srf", "srg", "srn", "srr", "srs", "sru", "srv", "srx", "ssp", "stj", "stk", "sud", "swf", "swg", "swl", "sww", "syn", "syu", "szo", "szw", "taj", "tal", "tat", "tcg", "tcj", "tcl", "tcv", "tdc", "tdj", "tdr", "tds", "tdz", "tet", "tfv", "tgt", "thn", "tir", "tiv", "tjt", "tju", "tke", "tkw", "tle", "tlv", "tmu", "tnb", "tnj", "tnl", "tnn", "tnp", "tnr", "tnu", "tnv", "tnw", "tpa", "tpb", "tpc", "tpn", "tpw", "tpx", "tqx", "tsu", "ttp", "tvg", "tvu", "tvx", "twb", "twi", "twu", "tww", "tyb", "tyr", "tyv", "uaa", "uab", "uag", "uai", "uan", "uao", "uap", "uar", "uaw", "uaz", "ube", "ubg", "ubj", "ubk", "ubv", "ubw", "uca", "uch", "uco", "ucs", "udr", "uds", "uea", "uee", "uef", "ufa", "ufb", "ufd", "ufg", "ufo", "ufs", "ufv", "ufw", "ufy", "uga", "ugu", "ugy", "uha", "uhf", "uhi", "uhl", "uhp", "uhr", "uhy", "uie", "uim", "uio", "uip", "uiw", "uix", "ujf", "ujg", "uji", "ujj", "ujn", "ujs", "ujt", "uju", "ujw", "ujx", "ujy", "uks", "ula", "ulb", "ulc", "ulg", "ulh", "ulj", "ulk", "ulm", "uln", "ulp", "ulq", "ulr", "uls", "ulv", "ulw", "ulx", "ulz", "umb", "ume", "umf", "umh", "umj", "umk", "uml", "umn", "umo", "ump", "umr", "ums", "umv", "umx", "umy", "uno", "uob", "uoe", "uog", "uop", "uou", "uov", "uoy", "uoz", "upl", "uqa", "uqb", "uqc", "uqi", "uqt", "uqx", "ura", "urd", "uru", "usu", "utu", "uua", "uub", "uuc", "uud", "uue", "uuf", "uuh", "uui", "uuk", "uum", "uun", "uuq", "uva", "uvb", "uvd", "uvi", "uvm", "uvo", "uvs", "uvt", "uvy", "uwe", "uwh", "uwl", "uwo", "uwp", "uws", "uws", "uwt", "uwy", "uxd", "uxi", "uyd", "uye", "uyf", "uym", "uyz", "uzo", "uzu", "uzv", "uzw", "vag", "var", "vbb", "vbg", "vbi", "vbm", "vbu", "vcd", "vch", "vcv", "vdc", "vdl", "vdq", "vdr", "ven", "vew", "vex", "vey", "vfc", "vfe", "vgf", "vgo", "vgv", "vgx", "vgy", "vhb", "vhr", "vhv", "vhy", "vim", "viv", "vix", "vjb", "vjt", "vke", "vlh", "vlj", "vln", "vlv", "vmj", "vml", "vmz", "vna", "voc", "vpb", "vph", "vpw", "vrj", "vrn", "vrv", "vsh", "vso", "vtd", "vtv", "vud", "vui", "vuj", "vuk", "vum", "vun", "vvi", "vwh", "vwl", "vxh", "vxi", "vxv", "vyv", "vzl", "vzm", "vzo", "vzp", "wau", "wav", "wba", "wbi", "wbs", "wbu", "wcd", "wcy", "wda", "wdr", "wew", "wfa", "wfg", "wfj", "wfk", "wfm", "wfw", "wfy", "wgf", "wgg", "wgi", "wgm", "wgs", "wgv", "wha", "wiz", "wjd", "wjt", "wju", "wjv", "wke", "wko", "wkx", "wli", "wlk", "wlt", "wlv", "wlz", "wma", "wmb", "wmf", "wmg", "wmj", "wmk", "wmp", "wms", "wmv", "wmw", "wnp", "wnv", "wnw", "woi", "woj", "wou", "wov", "woy", "wpa", "wpb", "wpc", "wpf", "wpl", "wpo", "wpp", "wps", "wpt", "wpw", "wpx", "wqb", "wqr", "wrl", "wry", "wsb", "wsf", "wsn", "wsp", "wsv", "wtd", "wti", "wtr", "wtv", "wtw", "wuk", "wun", "wva", "wvb", "wve", "wvi", "wvy", "wwd", "wwn", "wwv", "wwy", "wxg", "wxh", "wxi", "wxj", "wxr", "wxu", "wxw", "wxz", "wyy", "wzg", "wzi", "wzm", "wzp", "wzp", "wzq", "wzu", "wzw", "wzx", "xag", "xar", "xaz", "xbi", "xbm", "xbu", "xbw", "xcd", "xch", "xcq", "xdr", "xds", "xfy", "xgm", "xgq", "xhb", "xhh", "xie", "xih", "xii", "xij", "xik", "xio", "xiq", "xiu", "xiv", "xjw", "xkg", "xkk", "xkl", "xkq", "xku", "xlh", "xlv", "xlw", "xlx", "xmj", "xob", "xoi", "xoy", "xpb", "xph", "xpk", "xpn", "xpw", "xqx", "xrj", "xrl", "xru", "xrw", "xsb", "xsd", "xsh", "xsl", "xtd", "xtj", "xuc", "xui", "xuo", "xvj", "xwg", "xwj", "xwp", "xwt", "xwu", "xwv", "xwy", "xxb", "xxi", "xyu", "xyy", "xzb", "xzf", "xzi", "xzj", "xzl", "xzo", "xzp", "xzv", "yaa", "yag", "yai", "yam", "ych", "ydc", "yeb", "yej", "yeq", "yga", "ygn", "ygq", "ygr", "ygv", "ygz", "yha", "yhb", "yhy", "yia", "yib", "yik", "yiu", "yiy", "yjt", "yjw", "yjy", "yku", "yle", "ylv", "ymp", "yne", "ynn", "ynr", "yoa", "yob", "yoh", "yok", "ypn", "ypw", "ypx", "ypy", "yqx", "yrl", "yrm", "yru", "ysu", "yte", "ytj", "ytm", "ytq", "ytr", "ytv", "yuh", "yui", "yuj", "yvj", "yvm", "yvn", "ywh", "ywt", "yxh", "yyd", "yyg", "yyi", "yyp", "yyr", "yyu", "yyz", "yza", "yzy", "zab", "zac", "zay", "zbg", "zbi", "zbj", "zbw", "zcd", "zcx", "zdg", "zdm", "zds", "zeb", "zei", "zeu", "zfz", "zgd", "zgg", "zgm", "zgq", "zgv", "zhp", "zhr", "zhy", "zib", "zix", "ziy", "ziz", "zjt", "zju", "zjw", "zke", "zkf", "zky", "zlv", "zmb", "zmj", "zmt", "zmv", "zna", "znw", "znz", "zou", "zpa", "zpx", "zqx", "zri", "zrj", "zro", "zrp", "zru", "zrw", "zsb", "zsh", "ztv", "zue", "zun", "zvj", "zvm", "zvn", "zvu", "zwt", "zwv", "zxv", "zzg", "zzj", "zzk", "zzp", "zzr"]

class Sage_PonyStyle(ComfyNodeABC):
    @classmethod
    def INPUT_TYPES(cls) -> InputTypeDict:
        return {
            "required": {
                "style": (pony_strings, {"defaultInput": False, "multi_select": True, "chip": True, "placeholder": "Pony Style"})
            }
        }

    RETURN_TYPES = (IO.STRING,)
    RETURN_NAMES = ("text",)

    FUNCTION = "return_style"

    CATEGORY = "Sage Utils/text"
    DESCRIPTION = "Adds the chosen three letter artist styles from Pony v6."

    def return_style(self, style) -> tuple[str]:
        return (", ".join(style),)

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
            print(f"Error reading notes directory: {e}")
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
