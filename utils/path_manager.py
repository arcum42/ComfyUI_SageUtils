"""
Centralized path and file management for SageUtils.
Handles all paths, directory creation, and file initialization logic.
"""

import json
import pathlib
import tempfile
import os
from typing import Any, Dict, Optional

import folder_paths


class SagePathManager:
    """Centralized path management for SageUtils."""
    
    def __init__(self):
        # Base paths
        self.base_path = pathlib.Path(__file__).resolve().parent.parent
        self.users_path = pathlib.Path(folder_paths.get_user_directory())
        
        # Main directories
        self.sage_users_path = self.users_path / "default" / "SageUtils"
        self.assets_path = self.base_path / "assets"
        self.backup_path = self.sage_users_path / "backup"
        self.wildcard_path = self.sage_users_path / "wildcards"
        self.notes_path = self.sage_users_path / "notes"
        
        # Ensure all directories exist
        self._ensure_directories()
    
    def _ensure_directories(self) -> None:
        """Create all necessary directories."""
        for path in [self.sage_users_path, self.backup_path, self.wildcard_path, self.notes_path]:
            path.mkdir(parents=True, exist_ok=True)
    
    def get_user_file_path(self, filename: str) -> pathlib.Path:
        """Get the user file path for a given filename."""
        return self.sage_users_path / filename
    
    def get_user_override_file_path(self, filename: str) -> pathlib.Path:
        """Get the user override file path for a given filename."""
        base_name = pathlib.Path(filename).stem
        extension = pathlib.Path(filename).suffix
        return self.sage_users_path / f"{base_name}_user{extension}"
    
    def get_asset_file_path(self, filename: str) -> pathlib.Path:
        """Get the asset file path for a given filename."""
        return self.assets_path / filename
    
    def get_backup_file_path(self, filename: str) -> pathlib.Path:
        """Get the backup file path for a given filename."""
        return self.backup_path / filename


class SageFileManager:
    """Centralized file management for SageUtils."""
    
    def __init__(self, path_manager: SagePathManager):
        self.paths = path_manager
    
    def atomic_write_json(self, path: pathlib.Path, data: Any) -> None:
        """Write JSON data to a file atomically."""
        temp_dir = path.parent
        with tempfile.NamedTemporaryFile('w', dir=temp_dir, delete=False, encoding='utf-8') as tf:
            json.dump(data, tf, separators=(",", ":"), sort_keys=True, indent=4)
            tf.flush()
            os.fsync(tf.fileno())
            tempname = tf.name
        os.replace(tempname, path)
    
    def load_json_file(self, path: pathlib.Path, label: str = "file") -> Optional[Any]:
        """Load data from a JSON file."""
        try:
            with path.open("r", encoding="utf-8") as read_file:
                data = json.load(read_file)
            return data
        except Exception as e:
            print(f"Unable to load {label} from {path}: {e}")
            return None
    
    def save_json_file(self, path: pathlib.Path, data: Any, label: str = "file") -> bool:
        """Save data to a JSON file atomically."""
        try:
            self.atomic_write_json(path, data)
            return True
        except Exception as e:
            print(f"Unable to save {label} to {path}: {e}")
            return False
    
    def ensure_user_config_file(self, config_name: str, overwrite: bool = False) -> bool:
        """
        Ensure a user config file exists, copying from assets if needed.
        Returns True if file was created/updated, False otherwise.
        """
        asset_file = self.paths.get_asset_file_path(f"{config_name}.json")
        user_file = self.paths.get_user_file_path(f"{config_name}.json")
        
        if not user_file.is_file() or overwrite:
            if asset_file.is_file():
                try:
                    data = self.load_json_file(asset_file, f"default {config_name}")
                    if data is not None:
                        self.save_json_file(user_file, data, f"{config_name} user config")
                        print(f"Copied default {config_name}.json to {user_file}.")
                        return True
                except Exception as e:
                    print(f"Failed to copy {config_name}.json from assets: {e}")
            else:
                print(f"No default {config_name}.json found in assets.")
        
        return False
    
    def load_config_with_overrides(self, config_name: str) -> Dict[str, Any]:
        """
        Load a config file with user overrides.
        Merges main user file with optional user override file.
        """
        user_file = self.paths.get_user_file_path(f"{config_name}.json")
        override_file = self.paths.get_user_override_file_path(f"{config_name}.json")
        
        configs = []
        for path in [user_file, override_file]:
            if path.is_file():
                data = self.load_json_file(path, f"{config_name} config")
                if data is not None:
                    configs.append(data)
                    #print(f"Loading {config_name} from {path}")
        
        if not configs:
            return {}
        elif len(configs) == 1:
            return configs[0]
        else:
            # Deep merge configs
            merged = configs[0].copy()
            for config in configs[1:]:
                merged = self._deep_merge_dicts(merged, config)
            return merged
    
    def _deep_merge_dicts(self, a: Dict, b: Dict) -> Dict:
        """Recursively merge dict b into dict a and return the result."""
        result = a.copy()
        for k, v in b.items():
            if (
                k in result
                and isinstance(result[k], dict)
                and isinstance(v, dict)
            ):
                result[k] = self._deep_merge_dicts(result[k], v)
            else:
                result[k] = v
        return result


# Global instances
path_manager = SagePathManager()
file_manager = SageFileManager(path_manager)
