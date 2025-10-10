"""
Utility Routes Module
Handles utility functions and miscellaneous endpoints.
"""

import logging
import os
from aiohttp import web
from .base import route_error_handler, validate_query_params, success_response, error_response

# Route list for documentation and registration tracking
_route_list = []


def register_routes(routes_instance):
    """
    Register utility-related routes.
    
    Args:
        routes_instance: The PromptServer routes instance
        
    Returns:
        int: Number of routes registered
    """
    global _route_list
    _route_list.clear()
    
    @routes_instance.get('/sage_utils/file_size')
    @route_error_handler
    @validate_query_params('path')
    async def get_file_size(request):
        """
        Returns the file size for a given file path.
        Expects 'path' query parameter.
        """
        file_path = request.query.get('path')
        
        if not os.path.exists(file_path):
            return error_response("File not found", status=404)

        try:
            file_size = os.path.getsize(file_path)
            return success_response(data={
                "file_size": file_size,
                "file_path": file_path
            })
        except OSError as e:
            logging.error(f"Cannot access file {file_path}: {e}")
            return error_response(f"Cannot access file: {str(e)}", status=403)

    @routes_instance.post('/sage_utils/timing_data')
    @route_error_handler
    async def receive_timing_data(request):
        """
        Receive timing data from JavaScript side for analysis and reporting.
        """
        data = await request.json()
        source = data.get('source', 'unknown')
        timing_data = data.get('data', {})
        
        # Log the timing data
        print(f"\\n=== Timing Data from {source.upper()} ===")
        if 'initializationTimes' in timing_data:
            print("Initialization Times:")
            for milestone, time_ms in timing_data['initializationTimes'].items():
                if milestone != '__complete__':
                    print(f"  {milestone}: {time_ms:.4f}ms")
            
            if '__complete__' in timing_data['initializationTimes']:
                total = timing_data['initializationTimes']['__complete__']
                print(f"  TOTAL: {total:.4f}ms")
        
        if 'runtimeStats' in timing_data:
            print("Runtime Statistics:")
            for operation, stats in timing_data['runtimeStats'].items():
                if stats:
                    print(f"  {operation}: {stats.get('count', 0)} calls, "
                        f"{stats.get('total', 0):.4f}ms total, "
                        f"{stats.get('average', 0):.4f}ms avg")
        
        # Store timing data for potential analysis
        if not hasattr(receive_timing_data, 'timing_store'):
            receive_timing_data.timing_store = []
        
        receive_timing_data.timing_store.append({
            'timestamp': data.get('timestamp'),
            'source': source,
            'data': timing_data
        })
        
        # Keep only the last 10 entries to avoid memory issues
        if len(receive_timing_data.timing_store) > 10:
            receive_timing_data.timing_store = receive_timing_data.timing_store[-10:]
        
        return success_response(message=f"Timing data received from {source}")

    @routes_instance.get('/sage_utils/timing_report')
    @route_error_handler
    async def get_timing_report(request):
        """
        Get a combined timing report from both Python and JavaScript sides.
        """
        try:
            from ..utils.performance_timer import python_timer, server_timer
            
            report = {
                "python_timing": python_timer.export_to_dict(),
                "server_timing": server_timer.export_to_dict(),
                "javascript_timing": None
            }
            
            # Include recent JavaScript timing data if available
            if hasattr(receive_timing_data, 'timing_store') and receive_timing_data.timing_store:
                # Get the most recent JavaScript timing data
                js_data = None
                for entry in reversed(receive_timing_data.timing_store):
                    if entry['source'] == 'javascript':
                        js_data = entry['data']
                        break
                report["javascript_timing"] = js_data
            
            return success_response(data={"timing_report": report})
            
        except Exception as e:
            logging.error(f"Failed to generate timing report: {e}")
            return error_response(f"Failed to generate timing report: {str(e)}", status=500)

    # Track registered routes
    _route_list.extend([
        {"method": "GET", "path": "/sage_utils/file_size", "description": "Get file size for given path"},
        {"method": "POST", "path": "/sage_utils/timing_data", "description": "Receive timing data from frontend"},
        {"method": "GET", "path": "/sage_utils/timing_report", "description": "Get combined timing report"}
    ])
    
    return len(_route_list)


def get_route_list():
    """Get list of registered routes for this module."""
    return _route_list.copy()
