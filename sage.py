# A collection of utility nodes, many of which are dealing with metadata and collecting it.

# __init__.py is the entry point for the Sage Utils package. 
#  It contains the node definitions and the display names for the nodes. 
#  It also loads the cache and styles for the nodes. 

# It also imports this file, which imports the others.

# Node definitions are in the nodes folder.

import importlib
import os
import pathlib

import folder_paths

base_path = pathlib.Path(os.path.dirname(os.path.realpath(__file__)))
users_path = pathlib.Path(folder_paths.get_user_directory())
sage_users_path = users_path / "default" / "SageUtils"
os.makedirs(str(sage_users_path), exist_ok=True)

print(f"users_path: {str(sage_users_path)}")

cache = importlib.import_module(".utils.cache", package=base_path.name)
sage_styles = importlib.import_module(".utils.styles", package=base_path.name)

from comfy.comfy_types import IO, ComfyNodeABC, InputTypeDict
from .utils.helpers import *
