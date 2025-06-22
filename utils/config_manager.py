import json
from typing import Any, Dict, Optional

from .path_manager import path_manager, file_manager

class ConfigManager:
    """Simplified config manager that uses centralized file management."""
    
    def __init__(self, config_name: str, overwrite: bool = False):
        self.config_name = config_name
        self.data: Optional[Dict[str, Any]] = None
        
        # Ensure the user config file exists
        file_manager.ensure_user_config_file(config_name, overwrite=overwrite)

    def load(self) -> Dict[str, Any]:
        """Load configuration data with user overrides."""
        self.data = file_manager.load_config_with_overrides(self.config_name)
        return self.data

    def save(self, data: Optional[Dict[str, Any]] = None, user_override: bool = False) -> bool:
        """Save the configuration data to the appropriate user file."""
        to_save = data if data is not None else self.data
        if to_save is None:
            raise ValueError("No data to save.")
        
        if user_override:
            target_file = path_manager.get_user_override_file_path(f"{self.config_name}.json")
        else:
            target_file = path_manager.get_user_file_path(f"{self.config_name}.json")
        
        success = file_manager.save_json_file(target_file, to_save, f"{self.config_name} config")
        if success:
            print(f"Saved {self.config_name} to {target_file}.")
        return success

styles_manager = ConfigManager("sage_styles")
sage_styles = styles_manager.load()

prompts_manager = ConfigManager("llm_prompts")
llm_prompts = prompts_manager.load()

settings_manager = ConfigManager("config")
sage_config = settings_manager.load()

