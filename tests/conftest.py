import sys
import types
from pathlib import Path

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
