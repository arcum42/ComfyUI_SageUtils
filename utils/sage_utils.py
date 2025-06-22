"""
Convenience module for SageUtils file and path management.
Exports commonly used functions and objects.
"""

from .path_manager import path_manager, file_manager
from .config_manager import ConfigManager
from .model_cache import SageCache, cache

# Convenience functions for path access
def get_user_path(filename: str):
    """Get user file path for a filename."""
    return path_manager.get_user_file_path(filename)

def get_asset_path(filename: str):
    """Get asset file path for a filename."""
    return path_manager.get_asset_file_path(filename)

def get_backup_path(filename: str):
    """Get backup file path for a filename."""
    return path_manager.get_backup_file_path(filename)

def get_notes_path(filename: str = ""):
    """Get notes file path for a filename, or notes directory if no filename."""
    if filename:
        return path_manager.notes_path / filename
    return path_manager.notes_path

def get_wildcard_path(filename: str = ""):
    """Get wildcard file path for a filename, or wildcards directory if no filename."""
    if filename:
        return path_manager.wildcard_path / filename
    return path_manager.wildcard_path

# Convenience functions for file operations
def load_json(path, label="file"):
    """Load JSON from a file."""
    return file_manager.load_json_file(path, label)

def save_json(path, data, label="file"):
    """Save JSON to a file."""
    return file_manager.save_json_file(path, data, label)

def ensure_config_file(config_name, overwrite=False):
    """Ensure a config file exists in user directory."""
    return file_manager.ensure_user_config_file(config_name, overwrite)

# Path shortcuts
sage_users_path = path_manager.sage_users_path
sage_backup_path = path_manager.backup_path
sage_wildcard_path = path_manager.wildcard_path
sage_notes_path = path_manager.notes_path
assets_path = path_manager.assets_path

__all__ = [
    'path_manager', 'file_manager', 'ConfigManager', 'SageCache', 'cache',
    'get_user_path', 'get_asset_path', 'get_backup_path', 'get_notes_path', 'get_wildcard_path',
    'load_json', 'save_json', 'ensure_config_file',
    'sage_users_path', 'sage_backup_path', 'sage_wildcard_path', 'sage_notes_path', 'assets_path'
]
