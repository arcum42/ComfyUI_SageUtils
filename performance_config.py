#!/usr/bin/env python3
"""
SageUtils Performance Configuration

This script helps you configure and disable performance monitoring in SageUtils.
"""

import os
import json
import sys

def check_timing_status():
    """Check current timing configuration status."""
    print("=== SageUtils Performance Monitoring Status ===")
    
    # Check Python environment variables
    print("\nPython Configuration:")
    timing_logs = os.environ.get('SAGEUTILS_ENABLE_TIMING_LOGS', 'not set')
    print_timing = os.environ.get('SAGEUTILS_PRINT_TIMING', 'not set')
    
    print(f"  SAGEUTILS_ENABLE_TIMING_LOGS: {timing_logs}")
    print(f"  SAGEUTILS_PRINT_TIMING: {print_timing}")
    
    if timing_logs == 'not set' and print_timing == 'not set':
        print("  ✓ Python timing logs are DISABLED (default)")
    else:
        print("  ⚠ Python timing logs may be ENABLED")
    
    print("\nJavaScript Configuration:")
    print("  Check browser localStorage for 'sageutils_perf_monitoring'")
    print("  Check URL parameters for 'sageutils_perf=1'")
    print("  ✓ JavaScript timers are disabled by default unless explicitly enabled")

def disable_timing():
    """Disable all timing features."""
    print("=== Disabling SageUtils Performance Monitoring ===")
    
    # Unset environment variables if they exist
    if 'SAGEUTILS_ENABLE_TIMING_LOGS' in os.environ:
        del os.environ['SAGEUTILS_ENABLE_TIMING_LOGS']
        print("  ✓ Removed SAGEUTILS_ENABLE_TIMING_LOGS environment variable")
    
    if 'SAGEUTILS_PRINT_TIMING' in os.environ:
        del os.environ['SAGEUTILS_PRINT_TIMING']
        print("  ✓ Removed SAGEUTILS_PRINT_TIMING environment variable")
    
    print("\nTo disable JavaScript timing:")
    print("  1. Open browser developer console (F12)")
    print("  2. Run: localStorage.removeItem('sageutils_perf_monitoring')")
    print("  3. Refresh the ComfyUI page")
    print("\nAlternatively, open this page in your browser:")
    print("  file:///path/to/disable_performance_monitoring.html")

def enable_timing():
    """Enable timing features for debugging."""
    print("=== Enabling SageUtils Performance Monitoring ===")
    
    print("To enable Python timing logs:")
    print("  export SAGEUTILS_ENABLE_TIMING_LOGS=1")
    print("  export SAGEUTILS_PRINT_TIMING=1")
    
    print("\nTo enable JavaScript timing:")
    print("  1. Open browser developer console (F12)")
    print("  2. Run: localStorage.setItem('sageutils_perf_monitoring', 'true')")
    print("  3. Refresh the ComfyUI page")
    print("\nOr add URL parameter: ?sageutils_perf=1")

def main():
    """Main configuration utility."""
    if len(sys.argv) < 2:
        print("Usage: python performance_config.py [check|disable|enable]")
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    if command == 'check':
        check_timing_status()
    elif command == 'disable':
        disable_timing()
    elif command == 'enable':
        enable_timing()
    else:
        print("Invalid command. Use: check, disable, or enable")
        sys.exit(1)

if __name__ == '__main__':
    main()
