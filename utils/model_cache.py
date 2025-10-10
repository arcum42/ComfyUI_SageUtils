"""
Cache utilities for SageUtils.
Handles persistent storage and retrieval of model metadata, hashes, and info.
"""

import json
import pathlib
import hashlib
import datetime
import tempfile
import copy
import logging
import os
from typing import Any, Dict, Optional, List

from .path_manager import path_manager, file_manager

def str_to_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        value = value.lower()
        if value in {'true', '1', 'yes'}:
            return True
        elif value in {'false', '0', 'no'}:
            return False
    raise ValueError(f"Cannot convert {value} to boolean.")

def bool_to_str(value: Any) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    elif isinstance(value, str):
        value = value.lower()
        if value in {'true', '1', 'yes'}:
            return "true"
        elif value in {'false', '0', 'no'}:
            return "false"
    raise ValueError(f"Cannot convert {value} to string representation of boolean.")


class SageCache:
    """
    Persistent cache for model metadata, hashes, and info.
    """
    def __init__(self):
        # Use centralized path management
        self.main_path = path_manager.get_user_file_path("sage_cache.json")
        self.info_path = path_manager.get_user_file_path("sage_cache_info.json")
        self.hash_path = path_manager.get_user_file_path("sage_cache_hash.json")
        self.ollama_models_path = path_manager.get_user_file_path("sage_cache_ollama.json")

        self.data: Dict[str, Any] = {}
        self.hash: Dict[str, str] = {}
        self.info: Dict[str, Any] = {}
        self.ollama_models: Dict[str, Any] = {}
        self.last_hash: Dict[str, str] = {}
        self.last_info: Dict[str, Any] = {}
        self.last_ollama_models: Dict[str, Any] = {}

        self.prune_all_backups_on_init()

    def prune_all_backups_on_init(self) -> None:
        """Prune all backup files for known prefixes on initialization, printing only once."""
        logging.info("Pruning old backups for all known prefixes...")
        prefixes = [
            "sage_cache_info",
            "sage_cache_hash",
            "sage_cache_info-save-error",
            "sage_cache_hash-save-error",
            "sage_cache_info-error",
            "sage_cache_hash-error",
        ]
        for prefix in prefixes:
            self.prune_old_backups(prefix)

    def by_path(self, file_path: str) -> dict:
        """Get cache info by file path."""
        the_hash = self.hash.get(file_path, "")
        if the_hash:
            return self.info.get(the_hash, {})
        logging.warning(f"No hash found for file: {file_path}")
        return {}

    def by_hash(self, file_hash: str) -> dict:
        """Get cache info by file hash."""
        return self.info.get(file_hash, {})

    def convert_old_cache(self) -> None:
        """Convert old cache format to new format, splitting into hash and info."""
        logging.info("Converting old cache format to new format.")
        for key, val in self.data.items():
            current_hash = val.get("hash", "")
            if current_hash:
                self.hash[key] = current_hash
                try:
                    in_civitai = str_to_bool(val.get("civitai", False))
                except Exception:
                    in_civitai = False
                if not in_civitai:
                    self.info[current_hash] = val
        for key, val in self.data.items():
            current_hash = val.get("hash", "")
            try:
                in_civitai = str_to_bool(val.get("civitai", False))
            except Exception:
                in_civitai = False
            if current_hash and in_civitai:
                self.info[current_hash] = val

    def prune_old_backups(self, prefix: str, max_backups: int = 7) -> None:
        """Prune old backup files, keeping only the most recent max_backups by creation time, and deduplicate by file content."""
        backups = []
        for f in path_manager.backup_path.iterdir():
            if f.is_file() and f.name.startswith(prefix) and f.suffix == ".json":
                try:
                    ctime = f.stat().st_ctime
                    backups.append((ctime, f))
                except Exception:
                    continue
        backups.sort(reverse=True)  # Newest first
        # Deduplicate by file content hash
        hash_to_file = {}
        deduped_backups = []
        for ctime, f in backups:
            try:
                with f.open('rb') as file_obj:
                    file_bytes = file_obj.read()
                    file_hash = hashlib.sha256(file_bytes).hexdigest()
                if file_hash not in hash_to_file:
                    hash_to_file[file_hash] = (ctime, f)
                    deduped_backups.append((ctime, f))
                else:
                    f.unlink(missing_ok=True)
            except Exception:
                continue
        deduped_backups.sort(reverse=True)
        keep = deduped_backups[:max_backups]
        keep_files = set(f for _, f in keep)
        for _, f in deduped_backups[max_backups:]:
            try:
                f.unlink(missing_ok=True)
            except Exception:
                pass

    def _atomic_write_json(self, path: pathlib.Path, data: Any) -> None:
        """Write JSON data to a file atomically."""
        file_manager.atomic_write_json(path, data)

    def _save_json(self, path: pathlib.Path, data: Any, label: str) -> None:
        """Save data to a JSON file atomically, backing up and pruning old backups on error."""
        try:
            self._atomic_write_json(path, data)
        except Exception as e:
            logging.error(f"Unable to save {label} to {path}: {e}")
            current_date = datetime.datetime.now().strftime("%Y-%m-%dT%H-%M-%S")
            if path.is_file():
                error_prefix = f"{path.stem}-save-error"
                error_backup_path = path_manager.get_backup_file_path(f"{error_prefix}-{current_date}.json")
                try:
                    with path.open("r") as src_file, error_backup_path.open("w") as dst_file:
                        dst_file.write(src_file.read())
                    logging.info(f"Backed up problematic file to {error_backup_path}")
                except Exception as backup_e:
                    logging.error(f"Unable to backup error file {path} to {error_backup_path}: {backup_e}")

    def backup_json(self, backup_prefix: str, data: Any, current_date: str) -> None:
        """Backup data to a JSON file atomically, pruning old backups. Skip if identical backup already exists."""
        data_json = json.dumps(data, separators=(",", ":"), sort_keys=True, indent=4)
        data_hash = hashlib.sha256(data_json.encode("utf-8")).hexdigest()
        for f in path_manager.backup_path.iterdir():
            if f.is_file() and f.name.startswith(backup_prefix) and f.suffix == ".json":
                try:
                    with f.open("rb") as file_obj:
                        file_bytes = file_obj.read()
                        file_hash = hashlib.sha256(file_bytes).hexdigest()
                    if file_hash == data_hash:
                        return
                except Exception:
                    continue
        safe_date = current_date.replace(":", "-")
        backup_path = path_manager.get_backup_file_path(f"{backup_prefix}-{safe_date}.json")
        try:
            temp_dir = backup_path.parent
            with tempfile.NamedTemporaryFile('w', dir=temp_dir, delete=False, encoding='utf-8') as tf:
                tf.write(data_json)
                tf.flush()
                os.fsync(tf.fileno())
                tempname = tf.name
            os.replace(tempname, backup_path)
        except Exception as e:
            logging.error(f"Unable to backup {backup_prefix} to {backup_path}: {e}")

    def load_json_file(self, path: pathlib.Path, label: str, current_date: str) -> Optional[Any]:
        """Load data from a JSON file, backing up the file if an error occurs."""
        try:
            with path.open("r") as read_file:
                data = json.load(read_file)
            return data
        except Exception as e:
            logging.error(f"Unable to load {label} from {path}: {e}")
            if path.is_file():
                safe_date = current_date.replace(":", "-")
                error_prefix = f"{path.stem}-error"
                error_backup_path = path_manager.get_backup_file_path(f"{error_prefix}-{safe_date}.json")
                try:
                    with path.open("r") as src_file, error_backup_path.open("w") as dst_file:
                        dst_file.write(src_file.read())
                    logging.info(f"Backed up problematic file to {error_backup_path}")
                except Exception as backup_e:
                    logging.error(f"Unable to backup error file {path} to {error_backup_path}: {backup_e}")
            return None

    def load(self) -> None:
        """Load cache from disk only if not already loaded or if file has changed."""
        current_date = datetime.datetime.now().strftime("%Y-%m-%dT%H-%M-%S")
        if not hasattr(self, 'hash_mtime'):
            self.hash_mtime = None
        if not hasattr(self, 'info_mtime'):
            self.info_mtime = None
        if not hasattr(self, 'ollama_mtime'):
            self.ollama_mtime = None
        try:
            hash_needs_reload = False
            info_needs_reload = False
            ollama_needs_reload = False

            if self.ollama_models_path.is_file():
                ollama_mtime = self.ollama_models_path.stat().st_mtime
                if not self.ollama_models or self.ollama_mtime != ollama_mtime:
                    ollama_needs_reload = True
            
            if self.hash_path.is_file():
                hash_mtime = self.hash_path.stat().st_mtime
                if not self.hash or self.hash_mtime != hash_mtime:
                    hash_needs_reload = True
            if self.info_path.is_file():
                info_mtime = self.info_path.stat().st_mtime
                if not self.info or self.info_mtime != info_mtime:
                    info_needs_reload = True
            if self.hash_path.is_file() and self.info_path.is_file():
                if hash_needs_reload:
                    #print("Loading hash cache from disk.")
                    hash_data = self.load_json_file(self.hash_path, "hash cache", current_date)
                    if hash_data is not None:
                        self.hash = hash_data
                        self.last_hash = copy.deepcopy(self.hash)
                        self.hash_mtime = self.hash_path.stat().st_mtime
                        self.backup_json("sage_cache_hash", self.hash, current_date)
                    else:
                        self.hash = {}
                        self.last_hash = {}
                        self.hash_mtime = None
                if info_needs_reload:
                    #print("Loading info cache from disk.")
                    info_data = self.load_json_file(self.info_path, "info cache", current_date)
                    if info_data is not None:
                        self.info = info_data
                        self.last_info = copy.deepcopy(self.info)
                        self.info_mtime = self.info_path.stat().st_mtime
                        self.backup_json("sage_cache_info", self.info, current_date)
                    else:
                        self.info = {}
                        self.last_info = {}
                        self.info_mtime = None
            elif self.main_path.is_file():
                data = self.load_json_file(self.main_path, "main cache", current_date)
                if data is not None:
                    self.data = data
                    self.convert_old_cache()
                else:
                    self.data = {}
            if self.ollama_models_path.is_file() and ollama_needs_reload:
                ollama_data = self.load_json_file(self.ollama_models_path, "Ollama models cache", current_date)
                if ollama_data is not None:
                    self.ollama_models = ollama_data
                    self.last_ollama_models = copy.deepcopy(self.ollama_models)
                    self.ollama_mtime = self.ollama_models_path.stat().st_mtime
                    self.backup_json("sage_cache_ollama", self.ollama_models, current_date)
                else:
                    self.ollama_models = {}
                    self.last_ollama_models = {}
                    self.ollama_mtime = None
        except Exception as e:
            logging.error(f"Unable to load cache: {e}")

    def save(self) -> None:
        """Save cache to disk."""
        saved = False
        if self.hash and self.hash != self.last_hash:
            self._save_json(self.hash_path, self.hash, "hash cache")
            self.last_hash = copy.deepcopy(self.hash)
            saved = True
        if self.info and self.info != self.last_info:
            self._save_json(self.info_path, self.info, "info cache")
            self.last_info = copy.deepcopy(self.info)
            saved = True
        if self.ollama_models and self.ollama_models != self.last_ollama_models:
            self._save_json(self.ollama_models_path, self.ollama_models, "Ollama models cache")
            self.last_ollama_models = copy.deepcopy(self.ollama_models)
            saved = True
        if saved:
            logging.info("Saved cache to disk.")

    def add_entry(self, file_path: str, file_hash: str) -> None:
        self.hash[file_path] = file_hash
        if file_hash not in self.info:
            self.info[file_hash] = {
                "hash": file_hash,
                "lastUsed": "",
                "civitai": "False",
                "filePath": file_path
            }
        self.save()

    def add_or_update_entry(self, file_path: str, info_dict: dict) -> None:
        """
        Add or update a cache entry for a given file path.
        Ensures both hash and info are updated together.
        """
        file_hash = info_dict.get("hash")
        if not file_hash:
            raise ValueError("info_dict must contain a 'hash' key")
        self.hash[file_path] = file_hash
        self.info[file_hash] = info_dict

    def remove_entry(self, file_path: str) -> None:
        """
        Remove a cache entry by file path.
        Removes both hash and info if no other file uses the same hash.
        """
        file_hash = self.hash.get(file_path)
        if file_hash:
            del self.hash[file_path]
            if file_hash not in self.hash.values():
                self.info.pop(file_hash, None)

    def update_last_used_by_path(self, file_path: str) -> None:
        """
        Update the 'lastUsed' field for a given file path.
        """
        file_hash = self.hash.get(file_path)
        if file_hash:
            if file_hash in self.info:
                self.info[file_hash]['lastUsed'] = datetime.datetime.now().isoformat()
            else:
                self.add_entry(file_path, file_hash)
                self.info[file_hash]['lastUsed'] = datetime.datetime.now().isoformat()

    def update_last_used_by_hash(self, file_hash: str) -> None:
        """
        Update the 'lastUsed' field for a given file hash.
        """
        if file_hash in self.info:
            self.info[file_hash]['lastUsed'] = datetime.datetime.now().isoformat()

    def get_last_used_by_path(self, file_path: str) -> Optional[datetime.datetime]:
        """
        Get the 'lastUsed' field for a given file path.
        Returns None if the file path is not found.
        """
        file_hash = self.hash.get(file_path)
        if file_hash and file_hash in self.info:
            last_used_str = self.info[file_hash].get('lastUsed', '')
            if last_used_str:
                return datetime.datetime.fromisoformat(last_used_str)
        return None

    def get_models_by_model_id(self, model_id: Any) -> List[dict]:
        """
        Return a list of all model info dicts with the same modelId.
        For each, include a boolean 'latest_version_present' indicating if the update_version_id is present as an id in the cache.
        """
        id_to_info = {info.get("id"): info for info in self.info.values() if "id" in info}
        models = [info for info in self.info.values() if info.get("modelId") == model_id]
        for info in models:
            update_version_id = info.get("update_version_id")
            info["latest_version_present"] = bool(update_version_id and update_version_id in id_to_info)
        return models

# Global cache instance
cache = SageCache()
