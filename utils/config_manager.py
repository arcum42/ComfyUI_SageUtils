import os
import json
import pathlib

import folder_paths

base_path = pathlib.Path(os.path.dirname(os.path.realpath(__file__))).parent
users_path = pathlib.Path(folder_paths.get_user_directory())
sage_users_path = users_path / "default" / "SageUtils"
os.makedirs(str(sage_users_path), exist_ok=True)

class ConfigManager:
    def __init__(self, config_name):
        self.config_name = config_name
        self.data = None
        self.base_file = pathlib.Path(base_path) / f"{config_name}.json"
        self.user_file = sage_users_path / f"{config_name}.json"
        self.user_override_file = sage_users_path / f"{config_name}_user.json"
        self.ensure_user_file()

    def ensure_user_file(self):
        if not self.user_file.is_file():
            print(f"No {self.config_name}.json file found in user directory.")
            if self.base_file.is_file():
                with open(self.base_file, "r") as read_file:
                    temp = json.load(read_file)
                with open(self.user_file, "w") as write_file:
                    json.dump(temp, write_file, separators=(",", ":"), sort_keys=True, indent=4)
                print(f"Copied default {self.config_name}.json to {str(self.user_file)}.")

    def load(self):
        configs = []
        for path in [self.user_file, self.user_override_file]:
            if path.is_file():
                try:
                    with path.open(mode="r") as read_file:
                        configs.append(json.load(read_file))
                except Exception as e:
                    print(f"Unable to load {self.config_name} from {path}: {e}")
        # Merge configs (later overrides earlier)
        merged = {}
        for conf in configs:
            merged.update(conf)
        self.data = merged
        return self.data

# Usage examples:
styles_manager = ConfigManager("sage_styles")
sage_styles = styles_manager.load()

prompts_manager = ConfigManager("llm_prompts")
llm_prompts = prompts_manager.load()

settings_manager = ConfigManager("config")
settings_config = settings_manager.load()

