# This file contains text nodes that involve prompts for models, such as adding tags for pony based models, 
# or adding extra text specific models look for. Split off from text nodes to avoid cluttering that file 
# with a lot of nodes that are only tangentially related to text processing..

from __future__ import annotations
import json
from comfy_api.latest import io
from ..utils.logger import get_logger

# Import specific utilities from source modules
from ..utils.prompt_utils import clean_text
from ..utils.config_manager import sage_styles
from ..utils.constants import (
    LUMINA2_SYSTEM_PROMPTS_V2,
    PROMPT_START,
    LUMINA2_SYSTEM_PROMPT_TIP,
    PONY_V6_RATING,
    PONY_V7_RATING,
    PONY_SOURCE,
    SAGE_UTILS_CAT
)

logger = get_logger('nodes.prompts')

def _build_style_lookup(styles_data):
    model_to_styles = {}
    style_lookup = {}

    if not isinstance(styles_data, list):
        return model_to_styles, style_lookup

    for item in styles_data:
        if not isinstance(item, dict):
            continue

        model = str(item.get("model", "")).strip()
        style = str(item.get("style", "")).strip()
        if not model or not style:
            continue

        if model not in model_to_styles:
            model_to_styles[model] = []

        if style not in model_to_styles[model]:
            model_to_styles[model].append(style)

        style_lookup[(model, style)] = {
            "positive": str(item.get("positive", "") or ""),
            "negative": str(item.get("negative", "") or "")
        }

    return model_to_styles, style_lookup


STYLE_MODELS, STYLE_LOOKUP = _build_style_lookup(sage_styles)


def _apply_style_template(style_template: str, user_prompt: str) -> str:
    style_template = str(style_template or "").strip()
    user_prompt = str(user_prompt or "").strip()

    if not style_template:
        return user_prompt

    if "{prompt}" in style_template:
        return style_template.replace("{prompt}", user_prompt)

    if user_prompt:
        return f"{style_template}, {user_prompt}"

    return style_template


class Sage_StylePromptFromConfig(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        dynamic_options = []
        for model_name in STYLE_MODELS:
            styles_for_model = STYLE_MODELS.get(model_name, [])
            default_style = styles_for_model[0] if styles_for_model else "None"

            dynamic_options.append(
                io.DynamicCombo.Option(model_name, [
                    io.Combo.Input("style", display_name="style", options=styles_for_model or ["None"], default=default_style)
                ])
            )

        if not dynamic_options:
            dynamic_options = [
                io.DynamicCombo.Option("No models", [
                    io.Combo.Input("style", display_name="style", options=["No styles"], default="No styles")
                ])
            ]

        return io.Schema(
            node_id="Sage_StylePromptFromConfig",
            display_name="Style Prompt From Config",
            description="Builds positive and negative prompts from sage_styles.json. If a style template contains {prompt}, your input is inserted there; otherwise your input is appended with ', '.",
            category=f"{SAGE_UTILS_CAT}/text/prompt/style",
            inputs=[
                io.DynamicCombo.Input("model", options=dynamic_options),
                io.String.Input("positive", display_name="positive", force_input=True, multiline=True, tooltip="User positive prompt text to insert into the style template (or append if no {prompt} token exists)."),
                io.String.Input("negative", display_name="negative", force_input=True, multiline=True, tooltip="User negative prompt text to insert into the style template (or append if no {prompt} token exists).")
            ],
            outputs=[
                io.String.Output("positive_prompt", display_name="positive_prompt"),
                io.String.Output("negative_prompt", display_name="negative_prompt")
            ]
        )

    @classmethod
    def execute(cls, **kwargs):
        model_data = kwargs.get("model", {})
        positive = kwargs.get("positive", "")
        negative = kwargs.get("negative", "")

        selected_model = ""
        selected_style = ""

        if isinstance(model_data, dict):
            selected_model = str(model_data.get("model", "")).strip()
            selected_style = str(model_data.get("style", "")).strip()

        style_data = STYLE_LOOKUP.get((selected_model, selected_style), {})
        style_positive = style_data.get("positive", "")
        style_negative = style_data.get("negative", "")

        out_positive = _apply_style_template(style_positive, positive)
        out_negative = _apply_style_template(style_negative, negative)

        return io.NodeOutput(out_positive, out_negative)


# ============================================================================
# Specialized Lumina 2 and Pony nodes
# ============================================================================

class Sage_HiDreamE1_Instruction(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_HiDreamE1_Instruction",
            display_name="HiDream E1 Instruction",
            description="Generates a prompt for HiDream E1 based on the given instruction and description.",
            category=f"{SAGE_UTILS_CAT}/text/prompt/hidream",
            inputs=[
                io.String.Input("instruction", display_name="instruction", multiline=True),
                io.String.Input("description", display_name="description", multiline=True)
            ],
            outputs=[
                io.String.Output("prompt", display_name="prompt")
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

class Sage_LuminaPromptText(io.ComfyNode):
    """Combines a system prompt and a user prompt into a single prompt."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_PromptText",
            display_name="Prompt Text (Lumina 2)",
            description="Combines a system prompt and a user prompt into a single prompt, with <Prompt Start> between them.",
            category=f"{SAGE_UTILS_CAT}/text/prompt/lumina2",
            inputs=[
                io.String.Input("system", display_name="system", force_input=True, multiline=True),
                io.String.Input("prompt", display_name="prompt", force_input=True, multiline=True)
            ],
            outputs=[
                io.String.Output("combined_prompt", display_name="combined_prompt")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        system = kwargs.get("system", "")
        prompt = kwargs.get("prompt", "")
        combined_prompt = f"{system}{PROMPT_START}{prompt}"
        return io.NodeOutput(combined_prompt)

# The ernie prompt enhancer model is a fine tuned ministral 3. 
class Sage_ErniePromptEnhancerPrompt(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_ErniePromptEnhancerPrompt",
            display_name="Ernie Prompt Enhancer Prompt",
            description="Builds a prompt for the Ernie Prompt Enhancer model based on a prompt, image width, and image height. Connect to an LLM mode using native with a clip for Ernie's prompt enhancer, or the TextGenerate node in core. Uses the example prompt.",
            category=f"{SAGE_UTILS_CAT}/text/prompt/ernie",
            inputs=[
                io.String.Input("prompt", display_name="prompt", force_input=True, multiline=True),
                io.Int.Input("width", display_name="width", default=1024, min=1, max=8192),
                io.Int.Input("height", display_name="height", default=1024, min=1, max=8192)
            ],
            outputs=[
                io.String.Output("enhanced_prompt", display_name="enhanced_prompt")
            ]
        )

    @classmethod
    def execute(cls, **kwargs):
        prompt = kwargs.get("prompt", "")
        width = kwargs.get("width", 1024)
        height = kwargs.get("height", 1024)

        escaped_prompt = json.dumps(str(prompt or ""), ensure_ascii=False)[1:-1]
        ernie_prompt = (
                '<s>[SYSTEM_PROMPT]你是一个专业的文生图 Prompt 增强助手。你将收到用户的简短图片描述及目标生成分辨率，请据此扩写为一段内容丰富、细节充分的视觉描述，以帮助文生图模型生成高质量的图片。仅输出增强后的描述，不要包含任何解释或前缀。[/SYSTEM_PROMPT][INST]{"prompt": "$str_0", "width": $str_1, "height": $str_2}[/INST]'
                .replace("$str_0", escaped_prompt)
                .replace("$str_1", str(width))
                .replace("$str_2", str(height))
            )
        
        enhanced_prompt = ernie_prompt.strip()
        return io.NodeOutput(enhanced_prompt)

class Sage_LuminaSystemPrompt(io.ComfyNode):
    """Picks the system prompt based on the selected option."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_SystemPrompt",
            display_name="System Prompt (Lumina 2)",
            description="Picks the system prompt based on the selected option.",
            category=f"{SAGE_UTILS_CAT}/text/prompt/lumina2",
            inputs=[
                io.Combo.Input("system", display_name="system", options=list(LUMINA2_SYSTEM_PROMPTS_V2.keys()), default="superior", tooltip=LUMINA2_SYSTEM_PROMPT_TIP)
            ],
            outputs=[
                io.String.Output("system_prompt", display_name="system_prompt")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        system = kwargs.get("system", "superior")
        ret = LUMINA2_SYSTEM_PROMPTS_V2.get(system, "")
        return io.NodeOutput(ret)

pony_strings = ["aav", "aax", "aba", "aca", "acb", "acl", "acm", "acs", "aee", "aef", "aek", "aer", "aet", "aeu", "aew", "aex", "aey", "aff", "aga", "agi", "ago", "ahk", "ahl", "ahz", "aij", "ain", "aiu", "ajm", "aju", "ajy", "akd", "ake", "aki", "akk", "akm", "akr", "aku", "ali", "alp", "amu", "ana", "ani", "anu", "aoa", "aob", "aoj", "aov", "aox", "aoy", "api", "apm", "apo", "aqe", "aqg", "aqu", "aqx", "arb", "aro", "asa", "asm", "asn", "aso", "aua", "aur", "auv", "awd", "awf", "awm", "awv", "axp", "ayb", "ayl", "ayp", "ayq", "ayv", "ayw", "ayy", "aze", "azv", "baf", "bbq", "bcg", "bdc", "bdr", "bem", "bfb", "bfg", "bfq", "bfu", "bfv", "bgf", "bgk", "bgn", "bgv", "bha", "bhb", "bhl", "bhr", "bhz", "bif", "bih", "bim", "bip", "biy", "bjp", "bke", "bkm", "bks", "bku", "bkx", "bna", "bnp", "bnv", "bol", "bom", "bor", "bou", "bpb", "bpc", "bpw", "bpx", "brd", "brk", "brl", "brn", "brp", "brr", "brs", "brw", "brx", "bry", "brz", "bse", "bsl", "bsv", "bub", "bur", "bvk", "bvm", "bvq", "bwf", "bwl", "bwt", "bwu", "bwy", "bxh", "bys", "bzi", "bzl", "bzm", "cad", "cak", "cbr", "cbu", "cch", "cdr", "cds", "cgv", "chl", "ciu", "cle", "cln", "cly", "coh", "coi", "coy", "coz", "crb", "crr", "csb", "csf", "csz", "cte", "cwn", "cxd", "cxg", "cxh", "cxl", "cxw", "cxz", "cyq", "cyu", "czi", "dap", "dbg", "dbj", "dbu", "dbw", "dcd", "dce", "dch", "dck", "ddb", "ddk", "ddp", "deh", "dfd", "dfe", "dfk", "dfm", "dfo", "dhg", "dhl", "dih", "dit", "dja", "djv", "dkd", "dkg", "dki", "dko", "dkr", "dks", "dkt", "dku", "dkv", "dkw", "dky", "dlv", "dmb", "dmf", "dmg", "dmj", "dmk", "dmp", "dnw", "dpa", "dpb", "dpc", "dpf", "dph", "dpj", "dpk", "dpn", "dpo", "dpz", "dsh", "dsk", "dso", "dtb", "dtc", "dtd", "dth", "dtt", "dtu", "dtv", "dty", "dtz", "dvs", "dwc", "dwn", "dww", "dwx", "dwy", "dxo", "dxs", "dxv", "dyu", "dyv", "dza", "dze", "dze", "ebo", "ebp", "ebu", "efk", "egb", "egb", "egk", "egv", "egx", "ehb", "ehf", "ehh", "ehr", "ehx", "ehz", "eim", "ejt", "eka", "eke", "eki", "eky", "ela", "ema", "emc", "eoa", "eob", "eod", "eou", "eov", "eoy", "eqb", "eqc", "eqg", "eqr", "eqt", "eti", "euk", "eum", "evg", "ewi", "ewo", "ewu", "ewy", "exl", "eza", "ezo", "ezy", "fai", "fay", "fbg", "fbu", "fbv", "fbw", "fdv", "fdw", "fdz", "fei", "fem", "fey", "ffs", "fgd", "fgk", "fgq", "fgv", "fgz", "fhb", "fhl", "fhy", "fii", "fjt", "fju", "fjv", "fjx", "fke", "fkm", "fku", "fkw", "fla", "fln", "fpb", "fpw", "fpx", "fpz", "fqx", "fru", "frv", "frw", "fsb", "fsd", "fsf", "fso", "fsp", "fsv", "fvb", "fvd", "fvm", "fvn", "fvs", "fvv", "fvx", "fwh", "fwt", "fwx", "fwy", "fxc", "fxd", "fxv", "fyu", "fyx", "fyy", "fzj", "fzl", "fzm", "fzv", "fzw", "gad", "gaf", "gar", "gax", "gbu", "gcd", "gcg", "gch", "gcx", "gdr", "gea", "ght", "gjt", "gjv", "gjw", "gkb", "gkr", "gmq", "gmz", "goj", "gom", "gor", "gou", "gpc", "gpj", "gpn", "gpo", "gpw", "gpx", "grb", "grp", "grt", "gsb", "gsf", "gsh", "gsu", "gtv", "gtz", "gvb", "gvt", "gwg", "gwh", "gwl", "gwm", "gwt", "gwv", "gwy", "gwz", "gxh", "gxm", "gyy", "gzl", "gzm", "gzr", "gzw", "hag", "hai", "haj", "haz", "hbz", "hcd", "hch", "hda", "hdr", "hep", "hga", "hgt", "hgv", "hij", "hik", "hiq", "hiu", "hjt", "hka", "hke", "hki", "hku", "hlg", "hlk", "hll", "hlt", "hlu", "hmj", "hmp", "hna", "hnj", "hns", "hnu", "hpb", "hpw", "hpx", "hqr", "hsk", "hsn", "htm", "htv", "hua", "hui", "hvi", "hvy", "hwa", "hwd", "hwh", "hwj", "hwl", "hwu", "hwv", "hwz", "hxh", "hya", "hzj", "hzl", "hzm", "hzt", "iao", "iaw", "ibw", "idz", "ieb", "iee", "iel", "iew", "ifl", "iga", "igh", "igo", "igu", "iha", "ihb", "ihc", "ihh", "ihl", "iho", "ihp", "ihr", "ihv", "ihw", "ihz", "iia", "iim", "iin", "iio", "iiy", "ijb", "ijd", "ije", "ijg", "ijh", "iji", "ijk", "ijl", "ijm", "ijp", "ijq", "ijs", "ijv", "ijw", "ijx", "ijy", "ijz", "ikf", "ikm", "ikp", "iku", "iky", "ilb", "ilg", "ilp", "ilr", "ima", "imf", "imo", "inc", "ior", "ipi", "iqt", "iri", "iro", "iru", "iry", "ito", "iuc", "iud", "iue", "iui", "iuk", "iun", "ivh", "ivm", "iwg", "iwj", "iwl", "iwo", "iwp", "iwt", "iwu", "iwv", "iww", "iwy", "ixb", "ixe", "ixz", "iyb", "iyi", "iyo", "iyu", "jaf", "jah", "jaj", "jap", "jbc", "jbg", "jbj", "jbm", "jcd", "jch", "jcp", "jcy", "jdd", "jdg", "jds", "jel", "jfa", "jfb", "jfe", "jfm", "jfn", "jgd", "jgk", "jgm", "jhp", "jhy", "jio", "jju", "jjv", "jjz", "jke", "jkg", "jki", "jkv", "jkw", "jlk", "jln", "jlv", "jme", "jmf", "jmj", "jms", "jmv", "jnj", "jnl", "jpo", "jpw", "jpx", "jqr", "jrm", "jrn", "jrq", "jru", "jsf", "jsm", "jso", "jst", "jsv", "jtj", "jtm", "jtv", "juh", "jui", "jun", "jvb", "jvi", "jvj", "jvm", "jvn", "jvs", "jwh", "jwl", "jwt", "jwv", "jww", "jxd", "jxh", "jxm", "jyk", "jza", "jzd", "jze", "jzg", "jzj", "jzl", "jzm", "jzp", "kab", "kcd", "kch", "kdg", "kdk", "kdr", "kds", "kga", "kgd", "kgq", "kgv", "kgw", "khq", "kib", "kig", "kih", "kjt", "kjw", "klg", "kll", "klm", "kln", "klo", "kmj", "kmp", "kmq", "kmu", "kmw", "kmz", "kna", "koi", "koo", "kou", "kpb", "kpl", "kpm", "kpw", "kqr", "kqx", "ksb", "ksd", "ksf", "ksg", "ksh", "kuh", "kuu", "kvk", "kvl", "kvm", "kvx", "kwl", "kws", "kwv", "kwy", "kxf", "kxg", "kxl", "kxm", "kyg", "kyy", "kzf", "kzg", "kzl", "kzm", "kzr", "kzs", "kzt", "kzw", "lap", "lbi", "lbj", "lbk", "lbo", "lbp", "lbq", "lbu", "lbv", "lbw", "lcf", "lcm", "lcn", "lcp", "lcv", "ldu", "ldv", "lek", "lfh", "lgu", "lgv", "lhb", "lhc", "lhh", "lhy", "lia", "ljw", "lkb", "lkf", "lkg", "lkr", "llq", "lmb", "lml", "lmx", "lmy", "lmz", "lnf", "lnh", "lnp", "lnq", "lnv", "lnw", "loi", "lox", "lpb", "lpc", "lpm", "lpn", "lpt", "lpw", "lpx", "lqf", "lql", "lqx", "lrl", "lru", "lsc", "lsf", "lte", "ltr", "ltv", "lus", "lux", "luz", "lvm", "lvu", "lwb", "lwh", "lwl", "lwn", "lwq", "lwu", "lwy", "lwz", "lxb", "lxh", "lym", "lyn", "lyr", "lzg", "lzj", "lzl", "lzt", "lzy", "lzz", "mbb", "mbg", "mbo", "mdf", "mdg", "mdh", "mdl", "mdo", "mdr", "mdv", "mdw", "met", "mey", "mha", "mhb", "mhf", "mhg", "mhj", "mhk", "mhp", "mhv", "mhx", "mhy", "mii", "mio", "mjb", "mjm", "mjy", "mkb", "mkg", "mkl", "mkx", "mlx", "mmo", "mmr", "moc", "mpa", "mpf", "mph", "mpj", "mpk", "mpl", "mpn", "mpq", "mpr", "mpt", "mpu", "mpv", "mpw", "mpz", "mru", "msh", "msy", "mtd", "muh", "mui", "mul", "mup", "mur", "muu", "muy", "mwb", "mwf", "mwi", "mwn", "mwq", "mwt", "mwz", "mxj", "mxu", "myr", "myu", "mzg", "nan", "nar", "nax", "nbg", "nbi", "ncb", "ncc", "ncd", "nch", "ncl", "ncp", "ncv", "ncx", "nda", "ndr", "ndx", "nev", "nfd", "ngv", "nhd", "nhk", "nhp", "nhu", "nhv", "nhz", "nia", "nie", "nii", "nin", "nir", "nis", "niu", "nke", "nkf", "nki", "nkk", "nko", "nku", "nkv", "nkw", "nlo", "nlv", "nmb", "nmp", "nmu", "nmz", "nna", "nox", "npb", "npn", "npw", "npx", "nqr", "nqx", "nrf", "nrg", "nrh", "nsb", "nsc", "ntd", "nto", "nts", "ntu", "ntv", "ntz", "nvg", "nvi", "nvj", "nvk", "nvl", "nvo", "nvu", "nvv", "nwm", "nwn", "nwy", "nyi", "nyj", "nyk", "nyp", "nyr", "nyy", "nzb", "nzo", "oaa", "oat", "oav", "oax", "obo", "obu", "oca", "ode", "odh", "odk", "odl", "odp", "odr", "oee", "oel", "oey", "ofa", "ofp", "oge", "ogf", "ogk", "ogl", "ogr", "ogv", "oha", "ohg", "ohv", "ohw", "oia", "oib", "oih", "oii", "oim", "oip", "oir", "oix", "ojb", "ojn", "ojt", "ojv", "ojw", "oka", "okf", "olu", "ome", "omi", "omo", "omu", "omv", "onz", "ooh", "oou", "oov", "opb", "opg", "opk", "opl", "opq", "opv", "opw", "orh", "ori", "ose", "ota", "ott", "otv", "oue", "owb", "owf", "owg", "owh", "owi", "owz", "oxz", "oya", "oyj", "oym", "oyq", "oyu", "oyv", "oyy", "oyz", "oza", "ozo", "paf", "pag", "par", "pbc", "pbi", "pbv", "pbw", "pcd", "pdg", "pdk", "pdl", "pdn", "pdo", "pgm", "pgw", "pha", "phy", "pjy", "pkm", "pku", "pln", "pme", "pmj", "pmk", "pml", "pmp", "pnf", "pon", "poo", "ppp", "pri", "psf", "psm", "psp", "ptj", "pvo", "pvs", "pwh", "pwl", "pwn", "pwt", "pwy", "pxg", "pxh", "pxo", "pyb", "pyh", "pyq", "pyy", "pyz", "pzl", "pzm", "pzp", "pzw", "qag", "qak", "qar", "qaw", "qaz", "qbg", "qbu", "qbv", "qbw", "qbx", "qcd", "qch", "qci", "qcq", "qcy", "qcz", "qdc", "qdg", "qdk", "qdl", "qdr", "qgk", "qgm", "qgq", "qgs", "qgv", "qgy", "qgz", "qha", "qhb", "qhh", "qhp", "qhr", "qhy", "qhz", "qia", "qji", "qjl", "qjt", "qju", "qjv", "qjw", "qjx", "qjy", "qkp", "qkr", "qlh", "qlj", "qlt", "qmj", "qml", "qmp", "qmu", "qnj", "qob", "qoc", "qoe", "qoy", "qoz", "qpb", "qpp", "qpw", "qpx", "qqf", "qqr", "qqt", "qqv", "qqx", "qri", "qrj", "qrk", "qrp", "qru", "qsf", "qsv", "qtj", "qvj", "qvn", "qwg", "qwh", "qwl", "qwn", "qwt", "qwu", "qwv", "qwy", "qxh", "qxm", "qxq", "qxs", "qym", "qyp", "qyt", "qzl", "qzm", "qzo", "qzt", "rak", "rbh", "rbi", "rbj", "rbm", "rbq", "rbv", "rbw", "rbx", "rbz", "rcd", "rcf", "rch", "rea", "rek", "rga", "rgx", "rha", "rhc", "rhh", "rhn", "rhv", "riu", "rjg", "rjt", "rjy", "rjz", "rkf", "rkg", "rkq", "rkx", "rmv", "roc", "rou", "rov", "rpw", "rpy", "rpz", "rra", "rrg", "rsd", "rsl", "rsn", "rss", "rui", "rup", "rwy", "rxb", "rxg", "rxh", "rxj", "rxk", "rxw", "rxz", "ryb", "ryn", "rys", "rza", "rzj", "rzl", "rzm", "sae", "saz", "sbk", "sbl", "sdr", "seb", "seu", "sfv", "sfw", "sfy", "sgh", "sgy", "sha", "shq", "sht", "shu", "sid", "sij", "siu", "sjb", "sjc", "sjd", "sje", "sjf", "sjg", "sjh", "sji", "sjj", "sjk", "sjl", "sjm", "sjp", "sjq", "sjs", "sjt", "sju", "sjv", "sjw", "sjx", "sjy", "sjz", "skd", "sko", "sku", "slu", "sme", "smf", "smg", "smh", "smj", "smk", "smk", "sml", "smn", "smp", "smr", "smv", "smz", "sog", "soh", "soi", "soj", "sot", "sou", "spe", "sph", "srf", "srg", "srn", "srr", "srs", "sru", "srv", "srx", "ssp", "stj", "stk", "sud", "swf", "swg", "swl", "sww", "syn", "syu", "szo", "szw", "taj", "tal", "tat", "tcg", "tcj", "tcl", "tcv", "tdc", "tdj", "tdr", "tds", "tdz", "tet", "tfv", "tgt", "thn", "tir", "tiv", "tjt", "tju", "tke", "tkw", "tle", "tlv", "tmu", "tnb", "tnj", "tnl", "tnn", "tnp", "tnr", "tnu", "tnv", "tnw", "tpa", "tpb", "tpc", "tpn", "tpw", "tpx", "tqx", "tsu", "ttp", "tvg", "tvu", "tvx", "twb", "twi", "twu", "tww", "tyb", "tyr", "tyv", "uaa", "uab", "uag", "uai", "uan", "uao", "uap", "uar", "uaw", "uaz", "ube", "ubg", "ubj", "ubk", "ubv", "ubw", "uca", "uch", "uco", "ucs", "udr", "uds", "uea", "uee", "uef", "ufa", "ufb", "ufd", "ufg", "ufo", "ufs", "ufv", "ufw", "ufy", "uga", "ugu", "ugy", "uha", "uhf", "uhi", "uhl", "uhp", "uhr", "uhy", "uie", "uim", "uio", "uip", "uiw", "uix", "ujf", "ujg", "uji", "ujj", "ujn", "ujs", "ujt", "uju", "ujw", "ujx", "ujy", "uks", "ula", "ulb", "ulc", "ulg", "ulh", "ulj", "ulk", "ulm", "uln", "ulp", "ulq", "ulr", "uls", "ulv", "ulw", "ulx", "ulz", "umb", "ume", "umf", "umh", "umj", "umk", "uml", "umn", "umo", "ump", "umr", "ums", "umv", "umx", "umy", "uno", "uob", "uoe", "uog", "uop", "uou", "uov", "uoy", "uoz", "upl", "uqa", "uqb", "uqc", "uqi", "uqt", "uqx", "ura", "urd", "uru", "usu", "utu", "uua", "uub", "uuc", "uud", "uue", "uuf", "uuh", "uui", "uuk", "uum", "uun", "uuq", "uva", "uvb", "uvd", "uvi", "uvm", "uvo", "uvs", "uvt", "uvy", "uwe", "uwh", "uwl", "uwo", "uwp", "uws", "uws", "uwt", "uwy", "uxd", "uxi", "uyd", "uye", "uyf", "uym", "uyz", "uzo", "uzu", "uzv", "uzw", "vag", "var", "vbb", "vbg", "vbi", "vbm", "vbu", "vcd", "vch", "vcv", "vdc", "vdl", "vdq", "vdr", "ven", "vew", "vex", "vey", "vfc", "vfe", "vgf", "vgo", "vgv", "vgx", "vgy", "vhb", "vhr", "vhv", "vhy", "vim", "viv", "vix", "vjb", "vjt", "vke", "vlh", "vlj", "vln", "vlv", "vmj", "vml", "vmz", "vna", "voc", "vpb", "vph", "vpw", "vrj", "vrn", "vrv", "vsh", "vso", "vtd", "vtv", "vud", "vui", "vuj", "vuk", "vum", "vun", "vvi", "vwh", "vwl", "vxh", "vxi", "vxv", "vyv", "vzl", "vzm", "vzo", "vzp", "wau", "wav", "wba", "wbi", "wbs", "wbu", "wcd", "wcy", "wda", "wdr", "wew", "wfa", "wfg", "wfj", "wfk", "wfm", "wfw", "wfy", "wgf", "wgg", "wgi", "wgm", "wgs", "wgv", "wha", "wiz", "wjd", "wjt", "wju", "wjv", "wke", "wko", "wkx", "wli", "wlk", "wlt", "wlv", "wlz", "wma", "wmb", "wmf", "wmg", "wmj", "wmk", "wmp", "wms", "wmv", "wmw", "wnp", "wnv", "wnw", "woi", "woj", "wou", "wov", "woy", "wpa", "wpb", "wpc", "wpf", "wpl", "wpo", "wpp", "wps", "wpt", "wpw", "wpx", "wqb", "wqr", "wrl", "wry", "wsb", "wsf", "wsn", "wsp", "wsv", "wtd", "wti", "wtr", "wtv", "wtw", "wuk", "wun", "wva", "wvb", "wve", "wvi", "wvy", "wwd", "wwn", "wwv", "wwy", "wxg", "wxh", "wxi", "wxj", "wxr", "wxu", "wxw", "wxz", "wyy", "wzg", "wzi", "wzm", "wzp", "wzp", "wzq", "wzu", "wzw", "wzx", "xag", "xar", "xaz", "xbi", "xbm", "xbu", "xbw", "xcd", "xch", "xcq", "xdr", "xds", "xfy", "xgm", "xgq", "xhb", "xhh", "xie", "xih", "xii", "xij", "xik", "xio", "xiq", "xiu", "xiv", "xjw", "xkg", "xkk", "xkl", "xkq", "xku", "xlh", "xlv", "xlw", "xlx", "xmj", "xob", "xoi", "xoy", "xpb", "xph", "xpk", "xpn", "xpw", "xqx", "xrj", "xrl", "xru", "xrw", "xsb", "xsd", "xsh", "xsl", "xtd", "xtj", "xuc", "xui", "xuo", "xvj", "xwg", "xwj", "xwp", "xwt", "xwu", "xwv", "xwy", "xxb", "xxi", "xyu", "xyy", "xzb", "xzf", "xzi", "xzj", "xzl", "xzo", "xzp", "xzv", "yaa", "yag", "yai", "yam", "ych", "ydc", "yeb", "yej", "yeq", "yga", "ygn", "ygq", "ygr", "ygv", "ygz", "yha", "yhb", "yhy", "yia", "yib", "yik", "yiu", "yiy", "yjt", "yjw", "yjy", "yku", "yle", "ylv", "ymp", "yne", "ynn", "ynr", "yoa", "yob", "yoh", "yok", "ypn", "ypw", "ypx", "ypy", "yqx", "yrl", "yrm", "yru", "ysu", "yte", "ytj", "ytm", "ytq", "ytr", "ytv", "yuh", "yui", "yuj", "yvj", "yvm", "yvn", "ywh", "ywt", "yxh", "yyd", "yyg", "yyi", "yyp", "yyr", "yyu", "yyz", "yza", "yzy", "zab", "zac", "zay", "zbg", "zbi", "zbj", "zbw", "zcd", "zcx", "zdg", "zdm", "zds", "zeb", "zei", "zeu", "zfz", "zgd", "zgg", "zgm", "zgq", "zgv", "zhp", "zhr", "zhy", "zib", "zix", "ziy", "ziz", "zjt", "zju", "zjw", "zke", "zkf", "zky", "zlv", "zmb", "zmj", "zmt", "zmv", "zna", "znw", "znz", "zou", "zpa", "zpx", "zqx", "zri", "zrj", "zro", "zrp", "zru", "zrw", "zsb", "zsh", "ztv", "zue", "zun", "zvj", "zvm", "zvn", "zvu", "zwt", "zwv", "zxv", "zzg", "zzj", "zzk", "zzp", "zzr"]

class Sage_PonyStyle(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_PonyStyle",
            display_name="Pony Style",
            description="Adds the chosen three letter artist styles from Pony v6.",
            category=f"{SAGE_UTILS_CAT}/text/prompt/pony",
            
            inputs=[
                io.MultiCombo.Input("style", display_name="style", options=pony_strings, chip=True, placeholder="Pony Style")
            ],
            outputs=[
                io.String.Output("styled_text", display_name="styled_text")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        style = kwargs.get("style", [])
        
        styled_text = ""
        if not style:
            styled_text = ""
        
        if isinstance(style, str):
            style = [style]
        
        styled_text = ", ".join(style)
        return io.NodeOutput(styled_text)

class Sage_PonySource(io.ComfyNode):
    """Creates a source string for pony prompts."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_PonySource",
            display_name="Pony Source",
            description="Creates a source string for pony prompts based on the given source.",
            category=f"{SAGE_UTILS_CAT}/text/prompt/pony",
            inputs=[
                io.Combo.Input("source", display_name="source", options=PONY_SOURCE, default="none")
            ],
            outputs=[
                io.String.Output("source_text", display_name="source_text")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        source = kwargs.get("source", "none")
        if source == "none":
            return io.NodeOutput("")
        else:
            return io.NodeOutput(f"source_{source}, ")

class Sage_PonyScore(io.ComfyNode):
    """Creates a score string for pony prompts."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_PonyScore",
            display_name="Pony Score",
            description="Creates a score string for pony prompts based on the given start and end scores.",
            category=f"{SAGE_UTILS_CAT}/text/prompt/pony",
            inputs=[
                io.Int.Input("score_start", display_name="score_start", default=9, min=0, max=9, step=1),
                io.Int.Input("score_end", display_name="score_end", default=4, min=0, max=9, step=1),
                io.Boolean.Input("up_to", display_name="up_to", default=True, tooltip="If true, adds '_up' to the score string, except for score_9. (v6 uses up, v7 doesn't)")
            ],
            outputs=[
                io.String.Output("score_text", display_name="score_text")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
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

class Sage_PonyRatingv6(io.ComfyNode):
    """Creates a rating string for pony prompts (v6 style)."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_PonyRatingv6",
            display_name="Pony Rating (v6)",
            description="Creates a rating string for pony prompts based on the given rating. (v6 style)",
            category=f"{SAGE_UTILS_CAT}/text/prompt/pony",
            inputs=[
                io.Combo.Input("rating", display_name="rating", options=PONY_V6_RATING, default="none")
            ],
            outputs=[
                io.String.Output("rating_text", display_name="rating_text")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        rating = kwargs.get("rating", "none")
        if rating == "none":
            return io.NodeOutput("")
        else:
            return io.NodeOutput(f"rating_{rating}, ")

class Sage_PonyPrefix(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_PonyPrefix",
            display_name="Pony Prefix",
            description="Generates a prefix for pony-related content.",
            category=f"{SAGE_UTILS_CAT}/text/prompt/pony",
            inputs=[
                io.Boolean.Input("add_score", display_name="add_score", default=False),
                io.Int.Input("score_start", display_name="Score Start", default=9),
                io.Int.Input("score_end", display_name="Score End", default=4),
                io.Combo.Input("rating", display_name="rating", default="none", options=["none", "safe", "questionable", "explicit"]),
                io.Combo.Input("source", display_name="source", default="none", options=["none", "pony", "furry", "anime", "cartoon", "3d", "western", "comic", "monster"])
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

class Sage_PonyStyleCluster(io.ComfyNode):
    """Creates a style cluster string for pony prompts."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_PonyStyleCluster",
            display_name="Pony Style Cluster",
            description="Creates a style cluster string for pony prompts based on the given style cluster number.",
            category=f"{SAGE_UTILS_CAT}/text/prompt/pony",
            inputs=[
                io.Int.Input("style_cluster", display_name="style_cluster", default=1, min=1, max=2048, step=1)
            ],
            outputs=[
                io.String.Output("style_cluster_text", display_name="style_cluster_text")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        style_cluster = kwargs.get("style_cluster", 1)
        return io.NodeOutput(f"style_cluster_{style_cluster}, ")

class Sage_PonyRatingv7(io.ComfyNode):
    """Creates a rating string for pony prompts (v7 style)."""
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_PonyRatingv7",
            display_name="Pony Rating (v7)",
            description="Creates a rating string for pony prompts based on the given rating. (v7 style)",
            category=f"{SAGE_UTILS_CAT}/text/prompt/pony",
            inputs=[
                io.Combo.Input("rating", display_name="rating", options=PONY_V7_RATING, default="none")
            ],
            outputs=[
                io.String.Output("rating_text", display_name="rating_text")
            ]
        )
    
    @classmethod
    def execute(cls, **kwargs):
        rating = kwargs.get("rating", "none")
        if rating == "none":
            return io.NodeOutput("")
        else:
            return io.NodeOutput(f"rating_{rating}, ")

PROMPT_NODES = [
    # prompt style nodes
    Sage_StylePromptFromConfig,
    
    # prompt / Ernie specific
    Sage_ErniePromptEnhancerPrompt,
    
    # prompt / HiDream specific
    Sage_HiDreamE1_Instruction,
    
    # prompt / Lumina 2 specific
    Sage_LuminaPromptText,
    Sage_LuminaSystemPrompt,
    
    # prompt / pony specific
    Sage_PonyStyle,
    Sage_PonySource,
    Sage_PonyScore,
    Sage_PonyRatingv6,
    Sage_PonyPrefix,
    Sage_PonyStyleCluster,
    Sage_PonyRatingv7
]
