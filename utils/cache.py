import os
import json
import pathlib

import folder_paths

base_path = pathlib.Path(os.path.dirname(os.path.realpath(__file__))).parent
#print(f"Loading SageUtils cache from {str(base_path)}")

users_path = pathlib.Path(folder_paths.get_user_directory())
sage_users_path = users_path / "default" / "SageUtils"
os.makedirs(str(sage_users_path), exist_ok=True)

class SageCache:
    def __init__(self, path):
        if not (sage_users_path / "sage_cache.json").is_file():
            print("No cache file found in user directory.")
            if (pathlib.Path(path) / "sage_cache.json").is_file():
                with open((pathlib.Path(path) / "sage_cache.json"), "r") as read_file:
                    temp = json.load(read_file)

                with open((sage_users_path / "sage_cache.json"), "w") as write_file:
                    json.dump(temp, write_file, separators=(",", ":"), sort_keys=True, indent=4)
                
                print("Copied old cache file to {str(sage_users_path)}.")

        self.path = sage_users_path / "sage_cache.json"
        self.data = {}

    def load(self):
        try:
            if self.path.is_file():
                with self.path.open("r") as read_file:
                    self.data = json.load(read_file)
        except Exception as e:
            print(f"Unable to load cache: {e}")

    def save(self):
        try:
            if self.data:
                with self.path.open("w") as output_file:
                    json.dump(self.data, output_file, separators=(",", ":"), sort_keys=True, indent=4)
            else:
                print("Skipping saving cache, as the cache is empty.")
        except Exception as e:
            print(f"Unable to save cache: {e}")

cache = SageCache(base_path)
