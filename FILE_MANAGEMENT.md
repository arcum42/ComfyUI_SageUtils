# SageUtils File and Path Management

This document explains the reorganized file and path management system in SageUtils.

## Overview

The file and path management has been centralized into three main modules:

1. **`path_manager.py`** - Centralized path management
2. **`config_manager.py`** - Configuration file management (refactored)
3. **`model_cache.py`** - Model cache management (refactored)
4. **`sage_utils.py`** - Convenience module with commonly used functions

## Key Improvements

### 1. Centralized Path Management
- All paths are now managed in `SagePathManager`
- Consistent directory creation and path resolution
- Single source of truth for all file locations

### 2. Unified File Operations
- `SageFileManager` provides atomic JSON operations
- Consistent error handling and backup strategies
- Reusable file I/O methods

### 3. Consistent Initialization
- Config files are automatically copied from assets to user directory if missing
- Cache files are created in user directory as needed
- All necessary directories are created automatically

## File Locations

### Default Asset Files (read-only templates)
- `/assets/config.json` - Default settings
- `/assets/sage_styles.json` - Default styles
- `/assets/llm_prompts.json` - Default LLM prompts

### User Files (modifiable copies)
- `/user/default/SageUtils/config.json` - User settings
- `/user/default/SageUtils/sage_styles.json` - User styles  
- `/user/default/SageUtils/llm_prompts.json` - User LLM prompts

### User Override Files (optional)
- `/user/default/SageUtils/config_user.json` - User setting overrides
- `/user/default/SageUtils/sage_styles_user.json` - User style overrides
- `/user/default/SageUtils/llm_prompts_user.json` - User prompt overrides

### Cache Files
- `/user/default/SageUtils/sage_cache.json` - Legacy cache (converted automatically)
- `/user/default/SageUtils/sage_cache_hash.json` - File path to hash mapping
- `/user/default/SageUtils/sage_cache_info.json` - Hash to metadata mapping
- `/user/default/SageUtils/sage_cache_ollama.json` - Ollama model cache

### Backup Files
- `/user/default/SageUtils/backup/` - Automatic backups of all files

### Wildcard Files
- `/user/default/SageUtils/wildcards/` - User wildcard text files

### Notes Files
- `/user/default/SageUtils/notes/` - User notes and documentation files

## Usage Examples

### Using the convenience module:
```python
from .utils.sage_utils import get_user_path, load_json, save_json

# Get paths
user_config = get_user_path("my_config.json")

# Load/save JSON
data = load_json(user_config, "my config")
save_json(user_config, {"key": "value"}, "my config")
```

### Using path manager directly:
```python
from .utils.path_manager import path_manager, file_manager

# Get specific paths
backup_path = path_manager.get_backup_file_path("backup-2024.json")
asset_path = path_manager.get_asset_file_path("defaults.json")

# File operations
file_manager.ensure_user_config_file("new_config")
config = file_manager.load_config_with_overrides("config")
```

### Using config manager:
```python
from .utils.config_manager import ConfigManager

# Create and use a config manager
my_config = ConfigManager("my_config")
data = my_config.load()  # Loads with user overrides
my_config.save(data, user_override=True)  # Save to override file
```

## Migration Notes

### For Existing Code
- Replace direct file path references with path_manager calls
- Use file_manager for JSON operations instead of manual file handling
- Config files will be automatically migrated on first load

### Breaking Changes
- Old global path variables (`sage_users_path`, etc.) are now in `sage_utils.py`
- Manual directory creation is no longer needed
- File operations should use the centralized managers

## Benefits

1. **Consistency** - All files are handled the same way
2. **Reliability** - Atomic operations and error handling
3. **Maintainability** - Single place to modify path/file logic  
4. **Backup Safety** - Automatic backups with deduplication
5. **User Experience** - Automatic setup and migration
