#!/usr/bin/env python3
"""
SageUtils Performance Configuration

This script helps you configure and disable performance monitoring in SageUtils.
"""

import os
import json
import sys
import logging

def check_timing_status():
    """Check current timing configuration status."""
    logging.info("=== SageUtils Performance Monitoring Status ===")
    
    # Check Python environment variables
    logging.info("\nPython Configuration:")
    timing_logs = os.environ.get('SAGEUTILS_ENABLE_TIMING_LOGS', 'not set')
    print_timing = os.environ.get('SAGEUTILS_PRINT_TIMING', 'not set')

    logging.info(f"  SAGEUTILS_ENABLE_TIMING_LOGS: {timing_logs}. SAGEUTILS_PRINT_TIMING: {print_timing}")
    
    if timing_logs == 'not set' and print_timing == 'not set':
        logging.info("  ✓ Python timing logs are DISABLED (default)")
    else:
        logging.warning("  ⚠ Python timing logs may be ENABLED")

    logging.info("\nJavaScript Configuration:")
    logging.info("  Check browser localStorage for 'sageutils_perf_monitoring'")
    logging.info("  Check URL parameters for 'sageutils_perf=1'")
    logging.info("  ✓ JavaScript timers are disabled by default unless explicitly enabled")

def disable_timing():
    """Disable all timing features."""
    logging.info("=== Disabling SageUtils Performance Monitoring ===")

    # Unset environment variables if they exist
    if 'SAGEUTILS_ENABLE_TIMING_LOGS' in os.environ:
        del os.environ['SAGEUTILS_ENABLE_TIMING_LOGS']
        logging.info("  ✓ Removed SAGEUTILS_ENABLE_TIMING_LOGS environment variable")

    if 'SAGEUTILS_PRINT_TIMING' in os.environ:
        del os.environ['SAGEUTILS_PRINT_TIMING']
        logging.info("  ✓ Removed SAGEUTILS_PRINT_TIMING environment variable")

    logging.info("\nTo disable JavaScript timing:")
    logging.info("  1. Open browser developer console (F12)")
    logging.info("  2. Run: localStorage.removeItem('sageutils_perf_monitoring')")
    logging.info("  3. Refresh the ComfyUI page")
    logging.info("\nAlternatively, open this page in your browser:")
    logging.info("  file:///path/to/disable_performance_monitoring.html")

def enable_timing():
    """Enable timing features for debugging."""
    logging.info("=== Enabling SageUtils Performance Monitoring ===")

    logging.info("To enable Python timing logs:")
    logging.info("  export SAGEUTILS_ENABLE_TIMING_LOGS=1")
    logging.info("  export SAGEUTILS_PRINT_TIMING=1")

    logging.info("\nTo enable JavaScript timing:")
    logging.info("  1. Open browser developer console (F12)")
    logging.info("  2. Run: localStorage.setItem('sageutils_perf_monitoring', 'true')")
    logging.info("  3. Refresh the ComfyUI page")
    logging.info("\nOr add URL parameter: ?sageutils_perf=1")

def main():
    """Main configuration utility."""
    if len(sys.argv) < 2:
        logging.error("Usage: python performance_config.py [check|disable|enable]")
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    if command == 'check':
        check_timing_status()
    elif command == 'disable':
        disable_timing()
    elif command == 'enable':
        enable_timing()
    else:
        logging.error("Invalid command. Use: check, disable, or enable")
        sys.exit(1)

if __name__ == '__main__':
    main()
