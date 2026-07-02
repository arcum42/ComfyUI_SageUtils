import sys
import types
from pathlib import Path

# Provide a lightweight dummy for optional dependencies used by ComfyUI imports.
if 'av' not in sys.modules:
    av_module = types.ModuleType('av')
    av_module.__path__ = []
    av_module.open = lambda *args, **kwargs: None
    av_module.VideoStream = type('VideoStream', (), {})
    av_module.AudioStream = type('AudioStream', (), {})
    av_module.VideoFrame = type('VideoFrame', (), {'from_ndarray': staticmethod(lambda *args, **kwargs: None)})
    av_module.AudioFrame = type('AudioFrame', (), {'from_ndarray': staticmethod(lambda *args, **kwargs: None)})
    av_module.error = types.SimpleNamespace(InvalidDataError=Exception)

    container_module = types.ModuleType('av.container')
    class InputContainer:
        pass
    container_module.InputContainer = InputContainer

    subtitles_module = types.ModuleType('av.subtitles')
    stream_module = types.ModuleType('av.subtitles.stream')
    class SubtitleStream:
        pass
    stream_module.SubtitleStream = SubtitleStream

    sys.modules['av'] = av_module
    sys.modules['av.container'] = container_module
    sys.modules['av.subtitles'] = subtitles_module
    sys.modules['av.subtitles.stream'] = stream_module

if 'comfy_aimdo' not in sys.modules:
    comfy_aimdo_module = types.ModuleType('comfy_aimdo')
    comfy_aimdo_module.__path__ = []
    comfy_aimdo_module.host_buffer = types.ModuleType('comfy_aimdo.host_buffer')
    comfy_aimdo_module.vram_buffer = types.ModuleType('comfy_aimdo.vram_buffer')
    comfy_aimdo_module.model_vbar = types.ModuleType('comfy_aimdo.model_vbar')
    comfy_aimdo_module.torch = types.ModuleType('comfy_aimdo.torch')
    comfy_aimdo_module.control = types.ModuleType('comfy_aimdo.control')
    comfy_aimdo_module.model_mmap = types.ModuleType('comfy_aimdo.model_mmap')

    sys.modules['comfy_aimdo'] = comfy_aimdo_module
    sys.modules['comfy_aimdo.host_buffer'] = comfy_aimdo_module.host_buffer
    sys.modules['comfy_aimdo.vram_buffer'] = comfy_aimdo_module.vram_buffer
    sys.modules['comfy_aimdo.model_vbar'] = comfy_aimdo_module.model_vbar
    sys.modules['comfy_aimdo.torch'] = comfy_aimdo_module.torch
    sys.modules['comfy_aimdo.control'] = comfy_aimdo_module.control
    sys.modules['comfy_aimdo.model_mmap'] = comfy_aimdo_module.model_mmap

if 'nodes' not in sys.modules:
    sys.modules['nodes'] = types.ModuleType('nodes')

if 'comfy' not in sys.modules:
    comfy_module = types.ModuleType('comfy')
    comfy_module.__path__ = []
    comfy_module.utils = types.ModuleType('comfy.utils')
    class ProgressBar:
        def __init__(self, *args, **kwargs):
            pass
    comfy_module.utils.ProgressBar = ProgressBar
    sys.modules['comfy'] = comfy_module
    sys.modules['comfy.utils'] = comfy_module.utils

if 'comfy.cli_args' not in sys.modules:
    cli_args_module = types.ModuleType('comfy.cli_args')
    cli_args_module.args = types.SimpleNamespace(base_directory=None)
    sys.modules['comfy.cli_args'] = cli_args_module

if 'comfy_execution' not in sys.modules:
    comfy_execution_module = types.ModuleType('comfy_execution')
    comfy_execution_module.__path__ = []
    graph_utils_module = types.ModuleType('comfy_execution.graph_utils')
    class GraphBuilder:
        pass
    class ExecutionBlocker:
        pass
    graph_utils_module.GraphBuilder = GraphBuilder
    graph_utils_module.ExecutionBlocker = ExecutionBlocker
    sys.modules['comfy_execution'] = comfy_execution_module
    sys.modules['comfy_execution.graph_utils'] = graph_utils_module

# Ensure the ComfyUI and SageUtils roots are available for tests.
ROOT = Path(__file__).resolve().parent.parent
CUSTOM_NODES_ROOT = ROOT.parent
COMFYUI_ROOT = ROOT.parent.parent

# ComfyUI root must stay ahead of SageUtils paths so shared modules like
# `folder_paths` resolve from ComfyUI rather than the local helper package.
for path in (ROOT, CUSTOM_NODES_ROOT, COMFYUI_ROOT):
	path_str = str(path)
	if path_str in sys.path:
		sys.path.remove(path_str)
	sys.path.insert(0, path_str)


def _ensure_package(name: str, path: Path) -> None:
	module = sys.modules.get(name)
	if module is None:
		module = types.ModuleType(name)
		sys.modules[name] = module
	module.__path__ = [str(path)]


# Avoid executing the plugin package __init__ during unit tests. Most tests only
# need direct submodules under utils/, not full plugin startup side effects.
_ensure_package('comfyui_sageutils', ROOT)
_ensure_package('comfyui_sageutils.utils', ROOT / 'utils')
_ensure_package('comfyui_sageutils.utils.llm', ROOT / 'utils' / 'llm')


def _llm_raise(exc_type, message, *args, **kwargs):
	raise exc_type(message)


sys.modules['comfyui_sageutils.utils.llm'].llm_raise = _llm_raise
