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
        self.num_of_backups_to_keep = 7
        self.backup_counter = 0

        # Batch mode attributes for deferred saves/backups
        self.batch_mode = False
        self.pending_changes = 0
        self.batch_start_changes = 0
        self.save_count_since_backup = 0
        self.last_backup_time = datetime.datetime.now()
        
        # Configuration thresholds
        self.save_threshold = 10  # Save after N changes in batch mode (safety)
        self.backup_threshold = 50  # Backup after N saves
        self.backup_interval_seconds = 300  # 5 minutes between backups
        
        # Backup manifest for fast comparison
        self.backup_manifest_path = path_manager.get_backup_file_path("backup_manifest.json")
        self.backup_manifest: Dict[str, Dict[str, Any]] = {}
        self._load_backup_manifest()

        self.prune_all_backups()

    def _load_backup_manifest(self) -> None:
        """Load the backup manifest from disk."""
        if self.backup_manifest_path.exists():
            try:
                with self.backup_manifest_path.open('r') as f:
                    self.backup_manifest = json.load(f)
                logging.debug(f"Loaded backup manifest with {len(self.backup_manifest)} entries")
            except Exception as e:
                logging.warning(f"Failed to load backup manifest: {e}")
                self.backup_manifest = {}
        else:
            self.backup_manifest = {}
    
    def _save_backup_manifest(self) -> None:
        """Save the backup manifest to disk."""
        try:
            with self.backup_manifest_path.open('w') as f:
                json.dump(self.backup_manifest, f, indent=2)
        except Exception as e:
            logging.warning(f"Failed to save backup manifest: {e}")
    
    def _update_manifest_for_backup(self, backup_path: pathlib.Path, data: Any) -> None:
        """Update manifest entry for a backup file."""
        try:
            data_json = json.dumps(data, separators=(",", ":"), sort_keys=True)
            entry_count = len(data) if isinstance(data, dict) else 0
            file_size = len(data_json)
            content_hash = hashlib.sha256(data_json.encode("utf-8")).hexdigest()
            
            self.backup_manifest[backup_path.name] = {
                "timestamp": datetime.datetime.now().isoformat(),
                "entry_count": entry_count,
                "file_size": file_size,
                "content_hash": content_hash
            }
            self._save_backup_manifest()
        except Exception as e:
            logging.warning(f"Failed to update manifest for {backup_path.name}: {e}")

    def prune_all_backups(self) -> None:
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

    def prune_old_backups(self, prefix: str) -> None:
        """
        Prune old backup files with smart deduplication.
        
        Strategy:
        1. Group backups by content hash (exact duplicates)
        2. For each group, keep only the newest file
        3. Group remaining backups by entry count (similar backups)
        4. For similar backups, keep the one with most data
        5. Keep only num_of_backups_to_keep most recent unique backups
        """
        backups = []
        for f in path_manager.backup_path.iterdir():
            if f.is_file() and f.name.startswith(prefix) and f.suffix == ".json":
                try:
                    ctime = f.stat().st_ctime
                    file_size = f.stat().st_size
                    backups.append((ctime, file_size, f))
                except Exception:
                    continue
        
        if not backups:
            return
        
        backups.sort(reverse=True)  # Newest first
        
        # Phase 1: Deduplicate exact duplicates (by content hash)
        # Keep newest file from each duplicate group
        hash_to_best = {}
        for ctime, file_size, f in backups:
            try:
                with f.open('rb') as file_obj:
                    file_bytes = file_obj.read()
                    file_hash = hashlib.sha256(file_bytes).hexdigest()
                
                if file_hash not in hash_to_best:
                    # First file with this hash, keep it
                    hash_to_best[file_hash] = (ctime, file_size, f, file_bytes)
                else:
                    # Duplicate found, delete it (we keep the newer one already stored)
                    f.unlink(missing_ok=True)
                    if f.name in self.backup_manifest:
                        del self.backup_manifest[f.name]
                    logging.debug(f"Deleted duplicate backup: {f.name}")
            except Exception as e:
                logging.warning(f"Error processing backup {f.name}: {e}")
                continue
        
        # Phase 2: Smart similarity deduplication
        # Compare backups by entry count, keep the one with most data
        remaining_backups = []
        for file_hash, (ctime, file_size, f, file_bytes) in hash_to_best.items():
            try:
                data = json.loads(file_bytes.decode('utf-8'))
                entry_count = len(data) if isinstance(data, dict) else 0
                remaining_backups.append((ctime, file_size, entry_count, f, file_hash))
            except Exception as e:
                logging.warning(f"Error parsing backup {f.name}: {e}")
                # Keep it anyway, use file size as proxy for entry count
                remaining_backups.append((ctime, file_size, file_size, f, file_hash))
        
        # Sort by entry count (descending) then time (descending)
        remaining_backups.sort(key=lambda x: (x[2], x[0]), reverse=True)
        
        # Phase 3: Group by similar entry counts and keep best from each group
        # Two backups are "similar" if their entry counts are within 5% of each other
        similarity_threshold = 0.05
        unique_backups = []
        seen_entry_ranges = []
        
        for ctime, file_size, entry_count, f, file_hash in remaining_backups:
            # Check if this backup is similar to any we've already kept
            is_similar = False
            for kept_count in seen_entry_ranges:
                if kept_count == 0 and entry_count == 0:
                    is_similar = True
                    break
                elif kept_count > 0:
                    ratio = abs(entry_count - kept_count) / kept_count
                    if ratio <= similarity_threshold:
                        is_similar = True
                        break
            
            if not is_similar:
                # This backup is sufficiently different, keep it
                unique_backups.append((ctime, f))
                seen_entry_ranges.append(entry_count)
            else:
                # Similar to one we already kept, delete it
                try:
                    f.unlink(missing_ok=True)
                    if f.name in self.backup_manifest:
                        del self.backup_manifest[f.name]
                    logging.debug(f"Deleted similar backup: {f.name} ({entry_count} entries)")
                except Exception:
                    pass
        
        # Phase 4: Keep only num_of_backups_to_keep most recent
        unique_backups.sort(reverse=True)  # Sort by time, newest first
        keep = unique_backups[:self.num_of_backups_to_keep]
        keep_files = set(f for _, f in keep)
        
        for _, f in unique_backups[self.num_of_backups_to_keep:]:
            try:
                f.unlink(missing_ok=True)
                if f.name in self.backup_manifest:
                    del self.backup_manifest[f.name]
                logging.debug(f"Deleted old backup (exceeded limit): {f.name}")
            except Exception:
                pass
        
        # Save manifest after pruning
        self._save_backup_manifest()

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
        """
        Backup data to a JSON file atomically, with smart deduplication.
        
        Strategy:
        1. Check manifest first for fast comparison (avoids reading files)
        2. If similar backup exists (within 5% entry count), compare which has more data
        3. Keep the backup with more entries, delete the smaller one
        4. Skip if exact duplicate exists
        """
        data_json = json.dumps(data, separators=(",", ":"), sort_keys=True, indent=4)
        data_hash = hashlib.sha256(data_json.encode("utf-8")).hexdigest()
        entry_count = len(data) if isinstance(data, dict) else 0
        
        # Check manifest first for fast comparison
        similar_backup = None
        similar_entry_count = 0
        
        for backup_name, manifest_entry in self.backup_manifest.items():
            if not backup_name.startswith(backup_prefix):
                continue
                
            # Check for exact duplicate
            if manifest_entry.get("content_hash") == data_hash:
                logging.debug(f"Skipping backup - exact duplicate exists: {backup_name}")
                return
            
            # Check for similar backup (within 5% entry count)
            backup_entry_count = manifest_entry.get("entry_count", 0)
            if entry_count > 0 and backup_entry_count > 0:
                ratio = abs(entry_count - backup_entry_count) / max(entry_count, backup_entry_count)
                if ratio <= 0.05:
                    # Similar backup found
                    if backup_entry_count > similar_entry_count:
                        similar_backup = backup_name
                        similar_entry_count = backup_entry_count
        
        # If similar backup exists with more data, skip creating new backup
        if similar_backup and similar_entry_count >= entry_count:
            logging.debug(f"Skipping backup - similar backup with more data exists: {similar_backup} ({similar_entry_count} vs {entry_count} entries)")
            return
        
        # If similar backup exists with less data, delete it and create new one
        if similar_backup and similar_entry_count < entry_count:
            similar_path = path_manager.get_backup_file_path(similar_backup)
            try:
                if similar_path.exists():
                    similar_path.unlink()
                    del self.backup_manifest[similar_backup]
                    logging.info(f"Replaced smaller backup {similar_backup} ({similar_entry_count} entries) with larger backup ({entry_count} entries)")
            except Exception as e:
                logging.warning(f"Failed to delete smaller backup {similar_backup}: {e}")
        
        # Create new backup
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
            
            # Update manifest
            self._update_manifest_for_backup(backup_path, data)
            
            logging.debug(f"Created backup: {backup_path.name} ({entry_count} entries)")
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
        """Save cache to disk. Skipped if batch_mode is True."""
        # Skip save if in batch mode
        if self.batch_mode:
            return
        
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
            self.save_count_since_backup += 1
            logging.info("Saved cache to disk.")
    
    def begin_batch(self) -> None:
        """
        Start a batch operation - suppress saves and backups until end_batch() is called.
        Use this when performing bulk operations to avoid excessive I/O.
        
        Example:
            cache.begin_batch()
            try:
                for model in models:
                    process_model(model)
            finally:
                cache.end_batch(force_save=True)
        """
        if self.batch_mode:
            logging.warning("Batch mode already active - ignoring begin_batch() call")
            return
        
        self.batch_mode = True
        self.batch_start_changes = self.pending_changes
        logging.info("Batch mode started - saves and backups deferred")
    
    def end_batch(self, force_save: bool = True) -> None:
        """
        End a batch operation - perform a single save and create backup if needed.
        
        Args:
            force_save: If True, save even if no changes detected. Default True for safety.
        """
        if not self.batch_mode:
            logging.warning("Batch mode not active - ignoring end_batch() call")
            return
        
        self.batch_mode = False
        changes_in_batch = self.pending_changes - self.batch_start_changes
        
        if force_save or changes_in_batch > 0:
            # Perform the deferred save
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
                self.save_count_since_backup += 1
                logging.info(f"Batch save complete ({changes_in_batch} changes)")
                
                # Check if backup is needed
                self._create_backups_if_needed()
        else:
            logging.info("Batch mode ended with no changes - no save needed")
    
    def _create_backups_if_needed(self) -> None:
        """
        Create backups based on thresholds (count and time).
        Only creates backup if:
        - save_count_since_backup >= backup_threshold OR
        - time since last backup >= backup_interval_seconds
        """
        current_time = datetime.datetime.now()
        time_since_backup = (current_time - self.last_backup_time).total_seconds()
        
        should_backup = (
            self.save_count_since_backup >= self.backup_threshold or
            time_since_backup >= self.backup_interval_seconds
        )
        
        if should_backup:
            current_date = current_time.strftime("%Y-%m-%dT%H-%M-%S")
            
            # Create backups
            if self.hash:
                self.backup_json("sage_cache_hash", self.hash, current_date)
            if self.info:
                self.backup_json("sage_cache_info", self.info, current_date)
            if self.ollama_models:
                self.backup_json("sage_cache_ollama", self.ollama_models, current_date)
            
            # Reset counters
            self.save_count_since_backup = 0
            self.last_backup_time = current_time
            
            logging.info(f"Backups created (saves: {self.save_count_since_backup}, time: {time_since_backup:.0f}s)")

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
