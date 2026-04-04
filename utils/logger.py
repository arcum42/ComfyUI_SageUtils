"""
SageUtils logging infrastructure.
Provides a dedicated logger for all SageUtils operations.
"""
import logging
import os
from typing import Optional

# Logger name for all SageUtils components
LOGGER_NAME = "SageUtils"

# Default log level (can be overridden via environment variable)
DEFAULT_LOG_LEVEL = logging.INFO

# Environment variable for log level control
LOG_LEVEL_ENV_VAR = "SAGEUTILS_LOG_LEVEL"

# Valid log level names
LOG_LEVELS = {
    "DEBUG": logging.DEBUG,
    "INFO": logging.INFO,
    "WARNING": logging.WARNING,
    "ERROR": logging.ERROR,
    "CRITICAL": logging.CRITICAL,
}


def _get_root_logger() -> logging.Logger:
    """Get the root SageUtils logger."""
    return logging.getLogger(LOGGER_NAME)


def _resolve_log_level(level: Optional[int]) -> int:
    """Resolve an explicit level or environment-driven default level."""
    if level is not None:
        return level

    env_level = os.environ.get(LOG_LEVEL_ENV_VAR, "").upper()
    return LOG_LEVELS.get(env_level, DEFAULT_LOG_LEVEL)


def get_logger(name: Optional[str] = None) -> logging.Logger:
    """
    Get a logger instance for SageUtils.
    
    Args:
        name: Optional sub-module name (e.g., 'cache', 'routes', 'helpers')
              If provided, creates logger as 'SageUtils.{name}'
              If None, returns the root SageUtils logger
    
    Returns:
        Logger instance configured for SageUtils
    
    Example:
        # In utils/helpers.py
        logger = get_logger('helpers')
        logger.info("Processing model...")  # Logs as [SageUtils.helpers]
        
        # In routes/cache_routes.py
        logger = get_logger('routes.cache')
        logger.debug("Cache route called")  # Logs as [SageUtils.routes.cache]
    """
    if name:
        logger_name = f"{LOGGER_NAME}.{name}"
    else:
        logger_name = LOGGER_NAME
    
    return logging.getLogger(logger_name)


def configure_logging(level: Optional[int] = None, handler: Optional[logging.Handler] = None):
    """
    Configure the SageUtils logger with desired level and handler.
    
    This should be called once during initialization (__init__.py).
    
    Args:
        level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
               If None, reads from SAGEUTILS_LOG_LEVEL env var or uses DEFAULT_LOG_LEVEL
        handler: Custom handler to use. If None, uses StreamHandler with standard formatting
    
    Notes:
        - Only affects SageUtils logger, not ComfyUI's logging
        - Sub-loggers (e.g., SageUtils.helpers) inherit this configuration
        - Third-party library loggers can be configured separately
    
    Returns:
        The configured root SageUtils logger
    """
    # Get or create the root SageUtils logger
    logger = _get_root_logger()
    logger.setLevel(_resolve_log_level(level))
    
    # Clear existing handlers to avoid duplicates
    logger.handlers.clear()
    
    # Add handler
    if handler is None:
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            '[%(name)s] %(levelname)s: %(message)s'
        )
        handler.setFormatter(formatter)
    
    logger.addHandler(handler)
    
    # Prevent propagation to root logger to avoid duplicate messages
    logger.propagate = False
    
    return logger


def configure_third_party_logging():
    """
    Configure logging levels for third-party libraries used by SageUtils.
    
    Some libraries are very verbose and should have higher logging thresholds.
    This function sets appropriate levels for known chatty libraries.
    """
    library_levels = {
        'httpx': logging.WARNING,
        'urllib3': logging.WARNING,
        'ollama': logging.ERROR,
        'lmstudio': logging.ERROR,
        'asyncio': logging.WARNING,
    }

    for library_name, level in library_levels.items():
        logging.getLogger(library_name).setLevel(level)


def get_sageutils_logger() -> logging.Logger:
    """
    Get the root SageUtils logger.
    
    This is a convenience function for getting the main logger.
    For module-specific loggers, use get_logger(name) instead.
    
    Returns:
        The root SageUtils logger
    """
    return _get_root_logger()


def set_log_level(level: str):
    """
    Dynamically change the log level for SageUtils logger.
    
    Args:
        level: Log level name ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL')
    
    Raises:
        ValueError: If level is not a valid log level name
    
    Example:
        set_log_level('DEBUG')  # Enable debug logging
        set_log_level('WARNING')  # Only show warnings and errors
    """
    level_upper = level.upper()
    if level_upper not in LOG_LEVELS:
        raise ValueError(
            f"Invalid log level: {level}. "
            f"Valid levels are: {', '.join(LOG_LEVELS.keys())}"
        )
    
    logger = _get_root_logger()
    logger.setLevel(LOG_LEVELS[level_upper])


def get_log_level() -> str:
    """
    Get the current log level name for SageUtils logger.
    
    Returns:
        Log level name ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL')
    """
    logger = _get_root_logger()
    level = logger.level
    
    # Reverse lookup
    for name, value in LOG_LEVELS.items():
        if value == level:
            return name
    
    return "UNKNOWN"
