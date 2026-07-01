---
type: Guide
title: Logging Guide
description: Sage Utils logging strategy and diagnostics documentation.
resource: docs/deprecated/LOGGING.md
tags: [docs, logging, okf]
timestamp: 2026-07-01T00:00:00Z
---

# SageUtils Logging Guide

## Overview

SageUtils uses a dedicated logging system that is separate from ComfyUI's logging infrastructure. This allows for better control, clearer output, and easier debugging.

## Quick Start

### Using the Logger in Your Code

```python
from .utils.logger import get_logger

# Get a logger for your module
logger = get_logger('module_name')

# Use standard logging methods
logger.debug("Detailed diagnostic information")
logger.info("General informational message")
logger.warning("Warning about potential issues")
logger.error("Error that occurred but was handled")
logger.critical("Critical error that may cause failure")
```

### Logger Naming Conventions

Use hierarchical names that reflect your module's location:

```python
# In utils/helpers.py
logger = get_logger('helpers')

# In utils/helpers_civitai.py
logger = get_logger('helpers.civitai')

# In routes/cache_routes.py
logger = get_logger('routes.cache')

# In nodes/util_v3.py
logger = get_logger('nodes.util')

# In __init__.py
logger = get_logger('init')
```

### Log Output Format

All logs are prefixed with `[SageUtils.<module>]`:

```
[SageUtils.helpers] INFO: Processing model...
[SageUtils.routes.cache] DEBUG: Cache route called
[SageUtils.nodes.util] WARNING: Model not found, using default
```

## Log Levels

### When to Use Each Level

#### DEBUG
**Use for:** Detailed diagnostic information useful during development

**Examples:**
- Function entry/exit with parameters
- Loop iterations in complex operations
- Cache hits/misses
- Intermediate calculation results
- State changes in complex logic

```python
logger.debug(f"Entering calculate_hash with path={path}")
logger.debug(f"Cache hit for key: {key}")
logger.debug(f"Processing item {i}/{total}: {item}")
logger.debug(f"Intermediate result: {intermediate_value}")
```

#### INFO
**Use for:** General informational messages about normal operation

**Examples:**
- Successful initialization
- Configuration loading
- Progress updates for long operations
- Completion of major tasks
- Summary statistics

```python
logger.info("SageUtils initialized successfully")
logger.info(f"Scanning {len(models)} models for metadata")
logger.info(f"Cache loaded with {count} entries")
logger.info("Metadata pull complete")
```

#### WARNING
**Use for:** Potentially problematic situations that aren't errors

**Examples:**
- Deprecated features being used
- Missing optional dependencies
- Fallback to default values
- Skipped operations (e.g., blacklisted files)
- Configuration issues with workarounds

```python
logger.warning("Ollama library not found, LLM features disabled")
logger.warning(f"File {path} is blacklisted, skipping")
logger.warning(f"Invalid config value '{value}', using default")
logger.warning("Model metadata not found, using filename")
```

#### ERROR
**Use for:** Error conditions that don't crash the application

**Examples:**
- API call failures
- File I/O errors
- Invalid data that can be skipped
- Failed operations with fallbacks
- Exceptions that are caught and handled

```python
logger.error(f"HTTP error occurred: {http_err}")
logger.error(f"Error reading file {path}: {e}")
logger.error(f"Failed to load model metadata: {e}")
logger.error("Cache update failed, continuing with old data")
```

#### CRITICAL
**Use for:** Severe errors that may cause shutdown or data loss

**Examples:**
- Unrecoverable initialization failures
- Database corruption
- Critical resource unavailability
- Security violations

```python
logger.critical("Failed to initialize cache, cannot continue")
logger.critical(f"Unrecoverable error in core system: {e}")
logger.critical("Database corruption detected")
```

## Configuration

### Environment Variables

Control logging behavior without modifying code:

```bash
# Set log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
export SAGEUTILS_LOG_LEVEL=DEBUG

# Run ComfyUI with debug logging
SAGEUTILS_LOG_LEVEL=DEBUG python main.py

# Run with only warnings and errors
SAGEUTILS_LOG_LEVEL=WARNING python main.py
```

### Programmatic Configuration

In your code, you can dynamically change the log level:

```python
from .utils.logger import set_log_level, get_log_level

# Get current log level
current_level = get_log_level()  # Returns: 'INFO', 'DEBUG', etc.

# Change log level
set_log_level('DEBUG')  # Enable debug logging
set_log_level('WARNING')  # Only show warnings and errors
```

### Advanced Configuration

For custom configuration, modify the logger initialization in `__init__.py`:

```python
from .utils.logger import configure_logging
import logging

# Configure with custom handler
custom_handler = logging.FileHandler('sageutils.log')
configure_logging(level=logging.DEBUG, handler=custom_handler)
```

## Best Practices

### 1. Replace Print Statements

**Don't do this:**
```python
print(f"Processing {file_path}")
print(f"Warning: {warning_msg}")
```

**Do this:**
```python
logger.info(f"Processing {file_path}")
logger.warning(warning_msg)
```

### 2. Use Appropriate Log Levels

**Don't do this:**
```python
logger.info(f"Loop iteration {i}")  # Too verbose for INFO
logger.error("Model not in cache")  # Not really an error
```

**Do this:**
```python
logger.debug(f"Loop iteration {i}")  # Debug detail
logger.info("Model not in cache, fetching metadata")  # Informational
```

### 3. Include Context in Messages

**Don't do this:**
```python
logger.error("Failed")
logger.info("Done")
```

**Do this:**
```python
logger.error(f"Failed to load model from {path}: {e}")
logger.info(f"Completed metadata scan of {count} models in {duration:.2f}s")
```

### 4. Use f-strings for Formatting

**Good:**
```python
logger.info(f"Processing model: {model_name}")
logger.debug(f"Cache size: {len(cache)} entries")
```

### 5. Log Exceptions Properly

**Don't do this:**
```python
try:
    risky_operation()
except Exception as e:
    logger.error(str(e))
```

**Do this:**
```python
try:
    risky_operation()
except Exception as e:
    logger.error(f"Failed to perform risky operation: {e}", exc_info=True)
    # exc_info=True includes the full traceback in debug mode
```

### 6. Avoid Logging in Tight Loops

**Don't do this:**
```python
for item in large_list:  # 10,000 items
    logger.info(f"Processing {item}")  # Spam!
```

**Do this:**
```python
logger.info(f"Processing {len(large_list)} items")
for i, item in enumerate(large_list):
    if i % 1000 == 0:
        logger.debug(f"Progress: {i}/{len(large_list)}")
```

### 7. Use Hierarchical Logger Names

Organize loggers to match your module structure:

```python
# Good - reflects file location
logger = get_logger('utils.helpers.civitai')  # In utils/helpers_civitai.py
logger = get_logger('routes.cache')  # In routes/cache_routes.py
logger = get_logger('nodes.image')  # In nodes/image_v3.py

# Avoid - too generic or flat
logger = get_logger('helper')
logger = get_logger('mymodule')
```

## Migration from Print Statements

When converting print statements to logging:

### Informational Prints → INFO
```python
# Before
print("Loading models...")

# After
logger.info("Loading models...")
```

### Debug/Diagnostic Prints → DEBUG
```python
# Before
print(f"Debug: value = {value}")
print(f"Entering function with {params}")

# After
logger.debug(f"value = {value}")
logger.debug(f"Entering function with {params}")
```

### Warning Prints → WARNING
```python
# Before
print("Warning: File not found, using default")

# After
logger.warning("File not found, using default")
```

### Error Prints → ERROR
```python
# Before
print(f"Error: {error_message}")

# After
logger.error(error_message)
```

## Migration from Direct logging Calls

When converting from `logging.info()` to SageUtils logger:

```python
# Before
import logging
logging.info("Processing...")
logging.error(f"Error: {e}")

# After
from .utils.logger import get_logger
logger = get_logger('module_name')
logger.info("Processing...")
logger.error(f"Error: {e}")
```

## Troubleshooting

### Logs Not Appearing

1. Check log level:
```python
from .utils.logger import get_log_level
print(f"Current log level: {get_log_level()}")
```

2. Try setting to DEBUG:
```bash
SAGEUTILS_LOG_LEVEL=DEBUG python main.py
```

3. Verify logger is configured:
```python
from .utils.logger import get_sageutils_logger
logger = get_sageutils_logger()
print(f"Logger handlers: {logger.handlers}")
print(f"Logger level: {logger.level}")
```

### Duplicate Log Messages

This shouldn't happen with SageUtils logger (propagate=False), but if you see duplicates:

1. Check that you're not calling `configure_logging()` multiple times unnecessarily
2. Verify you're using `get_logger()` not `logging.getLogger()` directly

### Logs Going to Wrong Place

SageUtils logs go to stderr by default (StreamHandler). To redirect:

```python
import logging
from .utils.logger import configure_logging

# Log to file
file_handler = logging.FileHandler('sageutils.log')
configure_logging(handler=file_handler)

# Log to both console and file
console_handler = logging.StreamHandler()
file_handler = logging.FileHandler('sageutils.log')

logger = configure_logging(handler=console_handler)
logger.addHandler(file_handler)
```

## Third-Party Library Logging

SageUtils automatically configures logging levels for chatty third-party libraries:

- `httpx` → WARNING
- `urllib3` → WARNING
- `ollama` → ERROR
- `lmstudio` → ERROR
- `asyncio` → WARNING

This is handled by `configure_third_party_logging()` in `__init__.py`.

To add more libraries:

```python
# In utils/logger.py, configure_third_party_logging()
logging.getLogger('some_chatty_library').setLevel(logging.WARNING)
```

## Examples from Real Code

### Example: helpers.py

```python
from .logger import get_logger

logger = get_logger('helpers')

def calculate_hash(path):
    """Calculate hash for a file."""
    logger.debug(f"Calculating hash for {path}")
    
    try:
        file_size = os.path.getsize(path)
        logger.debug(f"File size: {file_size / (1024*1024):.1f} MB")
        
        if file_size > LARGE_FILE_THRESHOLD:
            logger.debug("Using fast hashing strategy for large file")
            result = fast_hash(path)
        else:
            result = full_hash(path)
        
        logger.debug(f"Calculated hash: {result[:8]}...")
        return result
    except Exception as e:
        logger.error(f"Error calculating hash for {path}: {e}")
        return None
```

### Example: cache_routes.py

```python
from ..utils.logger import get_logger

logger = get_logger('routes.cache')

async def get_cache(request):
    """Get cache data."""
    logger.debug("Cache route called")
    
    try:
        cache_data = cache.get_all()
        logger.info(f"Returning cache with {len(cache_data)} entries")
        return web.json_response(cache_data)
    except Exception as e:
        logger.error(f"Error retrieving cache data: {e}", exc_info=True)
        return web.json_response({"error": str(e)}, status=500)
```

### Example: nodes/util_v3.py

```python
from ..utils.logger import get_logger

logger = get_logger('nodes.util')

class ModelSelector:
    def select_model(self, model_name):
        """Select a model by name."""
        logger.debug(f"Selecting model: {model_name}")
        
        if model_name not in self.models:
            logger.warning(f"Model '{model_name}' not found, using default")
            model_name = self.default_model
        
        logger.info(f"Selected model: {model_name}")
        return self.models[model_name]
```

## Testing Your Logging

Always test your logging at different levels:

```python
# Test script
from utils.logger import configure_logging, get_logger
import logging

# Test at each level
for level_name, level_value in [
    ('DEBUG', logging.DEBUG),
    ('INFO', logging.INFO),
    ('WARNING', logging.WARNING),
]:
    print(f"\n=== Testing at {level_name} ===")
    configure_logging(level=level_value)
    
    logger = get_logger('test')
    logger.debug("This is debug")
    logger.info("This is info")
    logger.warning("This is warning")
    logger.error("This is error")
```

## Summary

- **Always use `get_logger('module_name')`** instead of print statements
- **Use hierarchical names** that match your file structure
- **Choose appropriate log levels** (DEBUG for detail, INFO for normal, WARNING/ERROR for problems)
- **Include context** in your messages
- **Test at different levels** to ensure your logging is appropriate
- **Set SAGEUTILS_LOG_LEVEL** environment variable to control verbosity

For more information, see the [Logging Improvement Plan](LOGGING_IMPROVEMENT_PLAN.md).
