"""
Cache utilities for SageUtils.
Handles persistent storage and retrieval of model metadata, hashes, and info.
"""

import os
import json
import pathlib
import re
import hashlib

import folder_paths
import datetime

users_path = pathlib.Path(folder_paths.get_user_directory())
sage_users_path = users_path / "default" / "SageUtils"
sage_backup_path = sage_users_path / "backup"
os.makedirs(str(sage_users_path), exist_ok=True)
os.makedirs(str(sage_backup_path), exist_ok=True)


class SageCache:
    """
    Persistent cache for model metadata, hashes, and info.
    """

    def __init__(self):

        self.main_path = sage_users_path / "sage_cache.json"
        self.info_path = sage_users_path / "sage_cache_info.json"
        self.hash_path = sage_users_path / "sage_cache_hash.json"
        self.info_backup_path = sage_backup_path / "sage_cache_info.json"
        self.hash_backup_path = sage_backup_path / "sage_cache_hash.json"

        self.data = {}
        self.hash = {}
        self.info = {}
        self.last_hash = {}
        self.last_info = {}

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

    def prune_old_backups(self, prefix, min_count=7, min_days=7):
        """Prune old backup files, keeping only the newest file for each unique hash, then enforce min_count and min_days."""
        print(f"Pruning old backups with prefix: {prefix}")
        # Updated regex to allow optional microseconds in timestamp
        pattern = re.compile(rf"{re.escape(prefix)}-(\d{{4}}-\d{{2}}-\d{{2}}T\d{{2}}:\d{{2}}:\d{{2}}(?:\.\d+)?).*\.json$")
        backups = []
        for f in sage_backup_path.iterdir():
            if f.is_file() and f.name.startswith(prefix) and f.suffix == ".json":
                m = pattern.search(f.name)
                if m:
                    try:
                        dt = datetime.datetime.fromisoformat(m.group(1))
                        backups.append((dt, f))
                    except Exception as e:
                        continue
        # Sort by date, newest first
        backups.sort(reverse=True)
        # Deduplicate by hash: keep only the newest file for each hash
        file_hash_map = {}
        for dt, f in backups:
            try:
                with f.open('rb') as file_obj:
                    file_bytes = file_obj.read()
                    file_hash = hashlib.sha256(file_bytes).hexdigest()
                file_hash_map[f] = file_hash
            except Exception:
                continue
        hash_to_file = {}
        deduped_backups = []
        for dt, f in backups:
            file_hash = file_hash_map.get(f)
            if not file_hash:
                continue
            if file_hash not in hash_to_file:
                hash_to_file[file_hash] = (dt, f)
                deduped_backups.append((dt, f))
            else:
                # Remove duplicate
                try:
                    f.unlink()
                except Exception as e:
                    pass
        # Now apply min_count and min_days logic to deduped_backups
        deduped_backups.sort(reverse=True)
        keep = deduped_backups[:min_count]
        now = datetime.datetime.now()
        days_kept = set(dt.date() for dt, _ in keep)
        for dt, f in deduped_backups[min_count:]:
            if (now - dt).days < min_days and dt.date() not in days_kept:
                keep.append((dt, f))
                days_kept.add(dt.date())
        keep_files = set(f for _, f in keep)
        for _, f in deduped_backups:
            if f not in keep_files:
                try:
                    f.unlink()
                except Exception as e:
                    pass
        print(f"Pruned old backups with prefix: {prefix}")

    def backup_json(self, backup_prefix, data, current_date):
        """Backup data to a JSON file, pruning old backups. Skip if identical backup already exists."""
        import hashlib
        # Serialize data to JSON and hash it
        data_json = json.dumps(data, separators=(",", ":"), sort_keys=True, indent=4)
        data_hash = hashlib.sha256(data_json.encode("utf-8")).hexdigest()
        # Check for existing identical backup
        for f in sage_backup_path.iterdir():
            if f.is_file() and f.name.startswith(backup_prefix) and f.suffix == ".json":
                try:
                    with f.open("rb") as file_obj:
                        file_bytes = file_obj.read()
                        file_hash = hashlib.sha256(file_bytes).hexdigest()
                    if file_hash == data_hash:
                        print(f"Identical backup already exists: {f}. Skipping new backup.")
                        return
                except Exception:
                    continue
        # No identical backup found, proceed to save
        backup_path = sage_backup_path / f"{backup_prefix}-{current_date}.json"
        try:
            with backup_path.open("w") as output_file:
                output_file.write(data_json)
            self.prune_old_backups(backup_prefix)
        except Exception as e:
            print(f"Unable to backup {backup_prefix} to {backup_path}: {e}")

    def load_json_file(self, path, label, current_date):
        """Load data from a JSON file, backing up the file if an error occurs."""
        try:
            with path.open("r") as read_file:
                data = json.load(read_file)
            return data
        except Exception as e:
            print(f"Unable to load {label} from {path}: {e}")
            # If file exists, back it up with an error suffix
            if path.is_file():
                error_prefix = f"{path.stem}-error"
                error_backup_path = sage_backup_path / f"{error_prefix}-{current_date}.json"
                try:
                    with path.open("r") as src_file, error_backup_path.open("w") as dst_file:
                        dst_file.write(src_file.read())
                    print(f"Backed up problematic file to {error_backup_path}")
                    self.prune_old_backups(error_prefix)
                except Exception as backup_e:
                    print(f"Unable to backup error file {path} to {error_backup_path}: {backup_e}")
            return None

    def load(self):
        """Load cache from disk only if not already loaded or if file has changed."""
        current_date = datetime.datetime.now().isoformat()
        # Track last modification times
        if not hasattr(self, 'hash_mtime'):
            self.hash_mtime = None
        if not hasattr(self, 'info_mtime'):
            self.info_mtime = None
        try:
            # Try to load new format (hash/info split)
            hash_needs_reload = False
            info_needs_reload = False
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
                    print("Loading hash cache from disk.")
                    hash_data = self.load_json_file(self.hash_path, "hash cache", current_date)
                    if hash_data is not None:
                        self.hash = hash_data
                        self.last_hash = self.hash.copy()
                        self.hash_mtime = self.hash_path.stat().st_mtime
                        self.backup_json("sage_cache_hash", self.hash, current_date)
                    else:
                        self.hash = {}
                        self.last_hash = {}
                        self.hash_mtime = None
                if info_needs_reload:
                    print("Loading info cache from disk.")
                    info_data = self.load_json_file(self.info_path, "info cache", current_date)
                    if info_data is not None:
                        self.info = info_data
                        self.last_info = self.info.copy()
                        self.info_mtime = self.info_path.stat().st_mtime
                        self.backup_json("sage_cache_info", self.info, current_date)
                    else:
                        self.info = {}
                        self.last_info = {}
                        self.info_mtime = None
            # Fallback: try to load old format
            elif self.main_path.is_file():
                data = self.load_json_file(self.main_path, "main cache", current_date)
                if data is not None:
                    self.data = data
                    self.convert_old_cache()
                else:
                    self.data = {}
        except Exception as e:
            print(f"Unable to load cache: {e}")

    def _save_json(self, path, data, label):
        """Save data to a JSON file, backing up and pruning old backups on error."""
        try:
            with path.open("w") as output_file:
                json.dump(data, output_file, separators=(",", ":"), sort_keys=True, indent=4)
        except Exception as e:
            print(f"Unable to save {label} to {path}: {e}")
            # If file exists, back it up with an error suffix
            current_date = datetime.datetime.now().isoformat()
            if path.is_file():
                error_prefix = f"{path.stem}-save-error"
                error_backup_path = sage_backup_path / f"{error_prefix}-{current_date}.json"
                try:
                    with path.open("r") as src_file, error_backup_path.open("w") as dst_file:
                        dst_file.write(src_file.read())
                    print(f"Backed up problematic file to {error_backup_path}")
                    self.prune_old_backups(error_prefix)
                except Exception as backup_e:
                    print(f"Unable to backup error file {path} to {error_backup_path}: {backup_e}")

    def save(self):
        """Save cache to disk."""
        saved = False
        if self.hash and self.hash != self.last_hash:
            self._save_json(self.hash_path, self.hash, "hash cache")
            self.last_hash = self.hash
            saved = True
        if self.info and self.info != self.last_info:
            self._save_json(self.info_path, self.info, "info cache")
            self.last_info = self.info
            saved = True
        if saved:
            print("Saved cache to disk.")
    
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

    def update_last_used_by_path(self, file_path: str):
        """
        Update the 'lastUsed' field for a given file path.
        """
        file_hash = self.hash.get(file_path)
        if file_hash and file_hash in self.info:
            self.info[file_hash]['lastUsed'] = datetime.datetime.now().isoformat()
    
    def update_last_used_by_hash(self, file_hash: str):
        """
        Update the 'lastUsed' field for a given file hash.
        """
        if file_hash in self.info:
            self.info[file_hash]['lastUsed'] = datetime.datetime.now().isoformat()
    
    def get_last_used_by_path(self, file_path: str) -> datetime.datetime | None:
        """
        Get the 'lastUsed' field for a given file path.
        Returns an empty string if the file path is not found.
        """
        file_hash = self.hash.get(file_path)
        if file_hash and file_hash in self.info:
            last_used_str = self.info[file_hash].get('lastUsed', '')
            if last_used_str:
                return datetime.datetime.fromisoformat(last_used_str)
            
        return None


# Global cache instance
cache = SageCache()
