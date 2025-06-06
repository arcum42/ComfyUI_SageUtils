"""
Cache utilities for SageUtils.
Handles persistent storage and retrieval of model metadata, hashes, and info.
"""

import os
import json
import pathlib

import folder_paths

users_path = pathlib.Path(folder_paths.get_user_directory())
sage_users_path = users_path / "default" / "SageUtils"
os.makedirs(str(sage_users_path), exist_ok=True)


class SageCache:
    """
    Persistent cache for model metadata, hashes, and info.
    """

    def __init__(self):
        if not (sage_users_path / "sage_cache.json").is_file():
            print("No cache file found in user directory.")

        self.main_path = sage_users_path / "sage_cache.json"
        self.info_path = sage_users_path / "sage_cache_info.json"
        self.hash_path = sage_users_path / "sage_cache_hash.json"
        self.data = {}
        self.hash = {}
        self.info = {}

    def by_path(self, file_path: str) -> dict:
        """Get cache info by file path."""
        the_hash = self.hash.get(file_path, "")
        if the_hash:
            return self.info.get(the_hash, {})
        print(f"No hash found for file: {file_path}")
        return {}

    def by_hash(self, file_hash: str) -> dict:
        """Get cache info by file hash."""
        return self.info.get(file_hash, {})

    def convert_old_cache(self):
        """Convert old cache format to new format, splitting into hash and info."""
        print("Converting old cache format to new format.")
        for key in self.data:
            current_hash = self.data[key].get("hash", "")
            if current_hash:
                self.hash[key] = current_hash
                # Add the ones not on civitai first
                if self.data[key].get("civitai", False) == False:
                    self.info[current_hash] = self.data[key]
        for key in self.data:
            current_hash = self.data[key].get("hash", "")
            # Add the ones on civitai, overwriting the previous ones
            if current_hash and self.data[key].get("civitai", False):
                self.info[current_hash] = self.data[key]

    def load(self):
        """Load cache from disk."""
        print("Loading cache from disk.")
        try:
            if self.hash_path.is_file() and self.info_path.is_file():
                with self.hash_path.open("r") as read_file:
                    self.hash = json.load(read_file)
                with self.info_path.open("r") as read_file:
                    self.info = json.load(read_file)
            else:
                if self.main_path.is_file():
                    with self.main_path.open("r") as read_file:
                        self.data = json.load(read_file)
                    self.convert_old_cache()
        except Exception as e:
            print(f"Unable to load cache: {e}")

    def save(self):
        """Save cache to disk."""
        def _save_json(path, data, label):
            print(f"Saving {label} to {path}")
            try:
                with path.open("w") as output_file:
                    json.dump(data, output_file, separators=(",", ":"), sort_keys=True, indent=4)
            except Exception as e:
                print(f"Unable to save {label} to {path}: {e}")

        #if self.data:
        #    _save_json(self.main_path, self.data, "main cache")
        if self.hash:
            print(f"Saving hash cache to {self.hash_path}")
            _save_json(self.hash_path, self.hash, "hash cache")
        if self.info:
            print(f"Saving info cache to {self.info_path}")
            _save_json(self.info_path, self.info, "info cache")
    
    def add_entry(self, file_path: str, file_hash: str):
        self.hash[file_path] = file_hash
        if file_hash not in self.info:
            self.info[file_hash] = {
                "hash": file_hash,
                "lastUsed": "",
                "civitai": False,
                "filePath": file_path
            }
        self.save()

    def add_or_update_entry(self, file_path: str, info_dict: dict):
        """
        Add or update a cache entry for a given file path.
        Ensures both hash and info are updated together.
        """
        file_hash = info_dict.get("hash")
        if not file_hash:
            raise ValueError("info_dict must contain a 'hash' key")
        self.hash[file_path] = file_hash
        self.info[file_hash] = info_dict

    def remove_entry(self, file_path: str):
        """
        Remove a cache entry by file path.
        Removes both hash and info if no other file uses the same hash.
        """
        file_hash = self.hash.get(file_path)
        if file_hash:
            del self.hash[file_path]
            # Only remove info if no other file_path uses this hash
            if file_hash not in self.hash.values():
                self.info.pop(file_hash, None)

    def update_last_used(self, file_path: str, dt: str):
        """
        Update the 'lastUsed' field for a given file path.
        """
        file_hash = self.hash.get(file_path)
        if file_hash and file_hash in self.info:
            self.info[file_hash]['lastUsed'] = dt


# Global cache instance
cache = SageCache()
