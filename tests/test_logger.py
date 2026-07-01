"""
Test suite for SageUtils logging infrastructure.
Run with: python -m pytest tests/test_logger.py -v
"""
import logging
import os
import sys
from io import StringIO

import pytest


# Ensure SageUtils package root is available for imports.
# The tests assume the repository is run from the SageUtils root or via pytest with tests/conftest.py.

from comfyui_sageutils.utils.logger import (
    get_logger,
    configure_logging,
    configure_third_party_logging,
    get_sageutils_logger,
    set_log_level,
    get_log_level,
    LOGGER_NAME,
    LOG_LEVELS
)


class TestLoggerBasics:
    """Test basic logger functionality."""
    
    def test_get_logger_no_name(self):
        """Test getting logger without a name returns root SageUtils logger."""
        logger = get_logger()
        assert logger.name == LOGGER_NAME
    
    def test_get_logger_with_name(self):
        """Test getting logger with a name creates hierarchical logger."""
        logger = get_logger('test_module')
        assert logger.name == f"{LOGGER_NAME}.test_module"
    
    def test_get_logger_with_nested_name(self):
        """Test getting logger with nested name."""
        logger = get_logger('routes.cache')
        assert logger.name == f"{LOGGER_NAME}.routes.cache"
    
    def test_get_sageutils_logger(self):
        """Test convenience function returns root logger."""
        logger = get_sageutils_logger()
        assert logger.name == LOGGER_NAME


class TestLoggerConfiguration:
    """Test logger configuration functionality."""
    
    def test_configure_logging_default(self):
        """Test configure_logging with default settings."""
        logger = configure_logging()
        assert logger.name == LOGGER_NAME
        assert logger.level == logging.INFO
        assert len(logger.handlers) == 1
        assert logger.propagate is False
    
    def test_configure_logging_with_level(self):
        """Test configure_logging with explicit level."""
        logger = configure_logging(level=logging.DEBUG)
        assert logger.level == logging.DEBUG
    
    def test_configure_logging_env_variable(self):
        """Test configure_logging respects environment variable."""
        # Save original env var
        original_level = os.environ.get('SAGEUTILS_LOG_LEVEL')
        
        try:
            os.environ['SAGEUTILS_LOG_LEVEL'] = 'DEBUG'
            logger = configure_logging()
            assert logger.level == logging.DEBUG
            
            os.environ['SAGEUTILS_LOG_LEVEL'] = 'WARNING'
            logger = configure_logging()
            assert logger.level == logging.WARNING
        finally:
            # Restore original env var
            if original_level is not None:
                os.environ['SAGEUTILS_LOG_LEVEL'] = original_level
            elif 'SAGEUTILS_LOG_LEVEL' in os.environ:
                del os.environ['SAGEUTILS_LOG_LEVEL']
    
    def test_configure_logging_custom_handler(self):
        """Test configure_logging with custom handler."""
        custom_handler = logging.StreamHandler(StringIO())
        logger = configure_logging(handler=custom_handler)
        assert len(logger.handlers) == 1
        assert logger.handlers[0] is custom_handler
    
    def test_configure_logging_no_duplicates(self):
        """Test that configure_logging clears old handlers."""
        configure_logging()
        configure_logging()
        logger = logging.getLogger(LOGGER_NAME)
        assert len(logger.handlers) == 1


class TestLogLevelManagement:
    """Test log level management functions."""
    
    def test_set_log_level_valid(self):
        """Test setting valid log levels."""
        for level_name in LOG_LEVELS.keys():
            set_log_level(level_name)
            assert get_log_level() == level_name
    
    def test_set_log_level_case_insensitive(self):
        """Test that set_log_level is case insensitive."""
        set_log_level('debug')
        assert get_log_level() == 'DEBUG'
        
        set_log_level('Info')
        assert get_log_level() == 'INFO'
    
    def test_set_log_level_invalid(self):
        """Test that invalid log level raises ValueError."""
        with pytest.raises(ValueError) as exc_info:
            set_log_level('INVALID')
        assert 'Invalid log level' in str(exc_info.value)
    
    def test_get_log_level(self):
        """Test get_log_level returns current level."""
        configure_logging(level=logging.DEBUG)
        assert get_log_level() == 'DEBUG'
        
        configure_logging(level=logging.ERROR)
        assert get_log_level() == 'ERROR'


class TestLoggerOutput:
    """Test actual logging output."""
    
    def setup_method(self):
        """Set up test with string buffer for capturing output."""
        self.log_buffer = StringIO()
        handler = logging.StreamHandler(self.log_buffer)
        formatter = logging.Formatter('[%(name)s] %(levelname)s: %(message)s')
        handler.setFormatter(formatter)
        configure_logging(level=logging.DEBUG, handler=handler)
    
    def get_log_output(self):
        """Get the logged output."""
        return self.log_buffer.getvalue()
    
    def test_logger_output_format(self):
        """Test that logger output follows expected format."""
        logger = get_logger('test')
        logger.info("Test message")
        output = self.get_log_output()
        assert '[SageUtils.test] INFO: Test message' in output
    
    def test_logger_levels(self):
        """Test all log levels produce output."""
        logger = get_logger('test')
        
        logger.debug("Debug message")
        logger.info("Info message")
        logger.warning("Warning message")
        logger.error("Error message")
        logger.critical("Critical message")
        
        output = self.get_log_output()
        assert 'DEBUG: Debug message' in output
        assert 'INFO: Info message' in output
        assert 'WARNING: Warning message' in output
        assert 'ERROR: Error message' in output
        assert 'CRITICAL: Critical message' in output
    
    def test_logger_respects_level(self):
        """Test that logger respects configured level."""
        self.log_buffer = StringIO()
        handler = logging.StreamHandler(self.log_buffer)
        configure_logging(level=logging.WARNING, handler=handler)
        
        logger = get_logger('test')
        logger.debug("Debug message")
        logger.info("Info message")
        logger.warning("Warning message")
        
        output = self.get_log_output()
        assert 'Debug message' not in output
        assert 'Info message' not in output
        assert 'Warning message' in output


class TestLoggerHierarchy:
    """Test hierarchical logger behavior."""
    
    def test_child_loggers_inherit_level(self):
        """Test that child loggers inherit parent's level."""
        configure_logging(level=logging.WARNING)
        
        parent = get_logger('parent')
        child = get_logger('parent.child')
        
        # Child should inherit WARNING level
        assert child.level == logging.NOTSET  # Child uses parent's level
        assert child.getEffectiveLevel() == logging.WARNING
    
    def test_loggers_dont_propagate_to_root(self):
        """Test that SageUtils loggers don't propagate to root logger."""
        configure_logging()
        logger = get_logger('test')
        assert logger.propagate is False or logging.getLogger(LOGGER_NAME).propagate is False


class TestThirdPartyConfiguration:
    """Test third-party library logging configuration."""
    
    def test_configure_third_party_logging(self):
        """Test that third-party loggers are configured correctly."""
        configure_third_party_logging()
        
        # Check that HTTP libraries are set to WARNING
        assert logging.getLogger('httpx').level == logging.WARNING
        assert logging.getLogger('urllib3').level == logging.WARNING
        
        # Check asyncio is set to WARNING
        assert logging.getLogger('asyncio').level == logging.WARNING


class TestLoggerUsageExamples:
    """Test examples that match documentation."""
    
    def setup_method(self):
        """Set up test with string buffer for capturing output."""
        self.log_buffer = StringIO()
        handler = logging.StreamHandler(self.log_buffer)
        formatter = logging.Formatter('[%(name)s] %(levelname)s: %(message)s')
        handler.setFormatter(formatter)
        configure_logging(level=logging.DEBUG, handler=handler)
    
    def test_usage_in_helpers_module(self):
        """Test example usage in helpers module."""
        logger = get_logger('helpers')
        logger.info("Processing model...")
        output = self.log_buffer.getvalue()
        assert '[SageUtils.helpers] INFO: Processing model...' in output
    
    def test_usage_in_route_module(self):
        """Test example usage in route module."""
        logger = get_logger('routes.cache')
        logger.debug("Cache route called")
        output = self.log_buffer.getvalue()
        assert '[SageUtils.routes.cache] DEBUG: Cache route called' in output
    
    def test_multiple_modules_distinct_output(self):
        """Test that multiple modules have distinct logger names."""
        helpers_logger = get_logger('helpers')
        cache_logger = get_logger('routes.cache')
        
        helpers_logger.info("Helpers message")
        cache_logger.info("Cache message")
        
        output = self.log_buffer.getvalue()
        assert '[SageUtils.helpers] INFO: Helpers message' in output
        assert '[SageUtils.routes.cache] INFO: Cache message' in output


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
