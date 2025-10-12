import os
import logging

# Uncomment the next line to enable debug logging
# logging.basicConfig(level=logging.DEBUG)

# Set to 1 for v1 nodes, 3 for v3 nodes.
# Right now, v3 nodes aren't ready for use.
CURRENT_NODE_VERSION = '1'
NODE_VERSION = os.environ.get('SAGEUTILS_NODE_VERSION', CURRENT_NODE_VERSION)

SAGEUTILS_PRINT_TIMING = False  # Set to True to enable timing report
# Print timing report if enabled via environment variable
if os.environ.get('SAGEUTILS_PRINT_TIMING', '').lower() in ('1', 'true', 'yes'):
    SAGEUTILS_PRINT_TIMING = True

# Initialize performance timing as early as possible
from .utils.performance_timer import python_timer, log_init
log_init("IMPORTS_START")

# Import all node classes
if NODE_VERSION == '1':
    from .nodes_v1 import *

# Import utility functions and objects
from .utils import cache, config_manager
log_init("UTILS_IMPORTED")

from .utils.llm_wrapper import init_llm
log_init("LLM_WRAPPER_IMPORTED")

ENABLE_TRAINING_NODES = True

# Initialize components
cache.load()
log_init("CACHE_LOADED")

# Initialize settings using the enhanced settings system
try:
    from .utils.settings import get_settings, get_sage_config
    settings = get_settings()  # This will load, validate, and set defaults
    sage_config = get_sage_config()  # Backwards compatibility
    log_init("SETTINGS_LOADED")
except ImportError as e:
    sage_config = config_manager.settings_manager.data
    log_init("SETTINGS_FALLBACK")

# Load other configuration data
sage_styles = config_manager.styles_manager.data
llm_prompts = config_manager.prompts_manager.data
metadata_templates = config_manager.metadata_template_manager.data
log_init("CONFIG_DATA_LOADED")

# Initialize LLM functionality
init_llm()
log_init("LLM_INITIALIZED")

# Import LLM availability flags for conditional node registration
from .utils import llm_wrapper as llm
log_init("LLM_FLAGS_IMPORTED")

# Import server routes to register custom HTTP endpoints
try:
    from . import server_routes
    log_init("SERVER_ROUTES_LOADED")
except Exception as e:
    import logging
    logging.warning(f"Warning: Failed to load SageUtils custom routes: {e}")
    log_init("SERVER_ROUTES_FAILED")

WEB_DIRECTORY = "./js"

if NODE_VERSION == '1':
    if llm.OLLAMA_AVAILABLE:
        LLM_CLASS_MAPPINGS = LLM_CLASS_MAPPINGS | OLLAMA_CLASS_MAPPINGS

    if llm.LMSTUDIO_AVAILABLE:
        LLM_CLASS_MAPPINGS = LLM_CLASS_MAPPINGS | LMSTUDIO_CLASS_MAPPINGS

    # A dictionary that contains all nodes you want to export with their names
    # NOTE: names should be globally unique
    NODE_CLASS_MAPPINGS |= NODE_CLASS_MAPPINGS | LLM_CLASS_MAPPINGS

    if ENABLE_TRAINING_NODES:
        NODE_CLASS_MAPPINGS = NODE_CLASS_MAPPINGS | TRAINING_CLASS_MAPPINGS

    if llm.OLLAMA_AVAILABLE:
        LLM_NAME_MAPPINGS = LLM_NAME_MAPPINGS | OLLAMA_NAME_MAPPINGS

    if llm.LMSTUDIO_AVAILABLE:
        LLM_NAME_MAPPINGS = LLM_NAME_MAPPINGS | LMSTUDIO_NAME_MAPPINGS

    # A dictionary that contains the friendly/human readable titles for the nodes
    NODE_DISPLAY_NAME_MAPPINGS = NODE_DISPLAY_NAME_MAPPINGS | LLM_NAME_MAPPINGS

    if ENABLE_TRAINING_NODES:
        NODE_DISPLAY_NAME_MAPPINGS = NODE_DISPLAY_NAME_MAPPINGS | TRAINING_NAME_MAPPINGS

    log_init("NODE_MAPPINGS_CREATED")

# Complete initialization timing
from .utils.performance_timer import complete_initialization, print_timing_report
total_init_time = complete_initialization()

# Start background LLM cache population to avoid delays during node use
try:
    from .utils.performance_fix import populate_llm_cache_async
    populate_llm_cache_async()
except Exception as e:
    logging.warning(f"Warning: Failed to start background LLM cache population: {e}")

# Print timing report if enabled.
if SAGEUTILS_PRINT_TIMING:
    print_timing_report()

if NODE_VERSION == '1':
    __all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS', 'WEB_DIRECTORY']
else:
    from .nodes_v3 import *
    __all__ = ['SageExtension', 'WEB_DIRECTORY']
