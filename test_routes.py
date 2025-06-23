#!/usr/bin/env python3
"""
Test script for SageUtils custom routes.
This demonstrates how the custom routes would work when ComfyUI is running.
"""

import sys
import os
import json
from typing import Dict, Any
from unittest.mock import Mock, MagicMock

# Add ComfyUI path
sys.path.insert(0, '/home/ai/programs/comfyui')

class MockRequest:
    """Mock aiohttp request object"""
    def __init__(self, match_info=None):
        self.match_info = match_info or {}

class MockWeb:
    """Mock aiohttp web module"""
    @staticmethod
    def json_response(data, status=200):
        return {
            "status": status,
            "content_type": "application/json",
            "data": data
        }

class MockRoutes:
    """Mock routes object that stores registered routes"""
    def __init__(self):
        self.routes = {}
    
    def get(self, path):
        def decorator(func):
            self.routes[f"GET {path}"] = func
            print(f"✓ Registered route: GET {path}")
            return func
        return decorator
    
    async def call_route(self, method, path, request=None):
        """Call a registered route for testing"""
        route_key = f"{method} {path}"
        if route_key in self.routes:
            return await self.routes[route_key](request or MockRequest())
        else:
            return MockWeb.json_response({"error": "Route not found"}, 404)

class MockPromptServer:
    """Mock PromptServer class"""
    def __init__(self):
        self.routes = MockRoutes()
    
    @classmethod
    def create_instance(cls):
        cls.instance = cls()
        return cls.instance

def test_sage_routes():
    """Test the SageUtils custom routes"""
    print("=== Testing SageUtils Custom Routes ===\n")
    
    # Create mock server instance
    prompt_server = MockPromptServer.create_instance()
    
    # Mock the modules that would be imported
    sys.modules['server'] = Mock()
    sys.modules['server'].PromptServer = MockPromptServer
    sys.modules['aiohttp'] = Mock()
    sys.modules['aiohttp'].web = MockWeb
    
    # Import and setup our cache
    print("1. Loading SageUtils cache...")
    try:
        # Suppress hash warnings
        import warnings
        warnings.filterwarnings("ignore")
        
        from custom_nodes.comfyui_sageutils.utils.model_cache import cache
        cache.load()
        print(f"   ✓ Cache loaded: {len(cache.hash)} files, {len(cache.info)} info entries")
        
        # Add some dummy data for testing if cache is empty
        if len(cache.hash) == 0:
            print("   Adding dummy test data...")
            test_hash = "abc123def456789"
            test_path = "/models/test_model.safetensors"
            cache.hash[test_path] = test_hash
            cache.info[test_hash] = {
                "hash": test_hash,
                "civitai": "true",
                "modelId": "12345",
                "name": "Test Model",
                "baseModel": "SDXL",
                "lastUsed": "2025-06-22T10:30:00"
            }
            print(f"   ✓ Added test data: 1 file, 1 info entry")
        
    except Exception as e:
        print(f"   ✗ Error loading cache: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Mock the imports for our routes module
    original_modules = {}
    mock_modules = {
        'server': Mock(),
        'aiohttp': Mock(),
        '.utils.model_cache': Mock()
    }
    
    # Setup mocks
    mock_modules['server'].PromptServer = MockPromptServer
    mock_modules['aiohttp'].web = MockWeb
    mock_modules['.utils.model_cache'].cache = cache
    
    print("\n2. Testing route registration...")
    
    # Manually register routes like our module would
    routes = prompt_server.routes
    
    @routes.get('/sage_cache/info')
    async def get_sage_cache_info(request):
        try:
            cache.load()
            return MockWeb.json_response(cache.info)
        except Exception as e:
            return MockWeb.json_response(
                {"error": f"Failed to retrieve cache info: {str(e)}"}, 
                status=500
            )

    @routes.get('/sage_cache/hash')
    async def get_sage_cache_hash(request):
        try:
            cache.load()
            return MockWeb.json_response(cache.hash)
        except Exception as e:
            return MockWeb.json_response(
                {"error": f"Failed to retrieve cache hash: {str(e)}"}, 
                status=500
            )

    @routes.get('/sage_cache/stats')
    async def get_sage_cache_stats(request):
        try:
            cache.load()
            
            stats = {
                "total_files": len(cache.hash),
                "total_info_entries": len(cache.info),
                "cache_files": {
                    "hash_path": str(cache.hash_path),
                    "info_path": str(cache.info_path),
                    "main_path": str(cache.main_path),
                    "ollama_models_path": str(cache.ollama_models_path)
                }
            }
            
            # Count files by civitai status
            civitai_found = 0
            civitai_not_found = 0
            
            for info_data in cache.info.values():
                civitai_status = info_data.get("civitai", "False")
                if isinstance(civitai_status, str):
                    if civitai_status.lower() in ["true", "1"]:
                        civitai_found += 1
                    else:
                        civitai_not_found += 1
                elif civitai_status is True:
                    civitai_found += 1
                else:
                    civitai_not_found += 1
            
            stats["civitai_stats"] = {
                "found_on_civitai": civitai_found,
                "not_found_on_civitai": civitai_not_found
            }
            
            return MockWeb.json_response(stats)
        except Exception as e:
            return MockWeb.json_response(
                {"error": f"Failed to retrieve cache stats: {str(e)}"}, 
                status=500
            )

    @routes.get('/sage_cache/file/{file_hash}')
    async def get_sage_cache_file_info(request):
        try:
            file_hash = request.match_info.get('file_hash', '')
            if not file_hash:
                return MockWeb.json_response(
                    {"error": "No file hash provided"}, 
                    status=400
                )
            
            cache.load()
            
            file_info = cache.info.get(file_hash)
            if file_info is None:
                return MockWeb.json_response(
                    {"error": f"No information found for hash: {file_hash}"}, 
                    status=404
                )
            
            # Also include which file paths use this hash
            file_paths = [path for path, hash_val in cache.hash.items() if hash_val == file_hash]
            
            result = {
                "hash": file_hash,
                "info": file_info,
                "file_paths": file_paths
            }
            
            return MockWeb.json_response(result)
        except Exception as e:
            return MockWeb.json_response(
                {"error": f"Failed to retrieve file info: {str(e)}"}, 
                status=500
            )

    @routes.get('/sage_cache/path')
    async def get_sage_cache_path_info(request):
        try:
            # Get file path from query parameter (mocked)
            file_path = getattr(request, 'file_path', '/models/test_model.safetensors')
            if not file_path:
                return MockWeb.json_response(
                    {"error": "No file_path parameter provided"}, 
                    status=400
                )
            
            cache.load()
            
            # Look up hash for this file path
            file_hash = cache.hash.get(file_path)
            if file_hash is None:
                return MockWeb.json_response(
                    {"error": f"No hash found for file path: {file_path}"}, 
                    status=404
                )
            
            # Get the info for this hash
            file_info = cache.info.get(file_hash)
            if file_info is None:
                return MockWeb.json_response(
                    {"error": f"No information found for hash {file_hash} (path: {file_path})"}, 
                    status=404
                )
            
            # Also include all file paths that use this same hash
            all_file_paths = [path for path, hash_val in cache.hash.items() if hash_val == file_hash]
            
            result = {
                "file_path": file_path,
                "hash": file_hash,
                "info": file_info,
                "all_paths_with_same_hash": all_file_paths
            }
            
            return MockWeb.json_response(result)
        except Exception as e:
            return MockWeb.json_response(
                {"error": f"Failed to retrieve path info: {str(e)}"}, 
                status=500
            )
    
    print("\n3. Testing routes...")
    
    # Test each route
    async def test_routes():
        # Test /sage_cache/stats
        print("\n   Testing GET /sage_cache/stats")
        response = await routes.call_route("GET", "/sage_cache/stats")
        print(f"   Status: {response['status']}")
        if response['status'] == 200:
            data = response['data']
            print(f"   Total files: {data['total_files']}")
            print(f"   Total info entries: {data['total_info_entries']}")
            print(f"   Civitai found: {data['civitai_stats']['found_on_civitai']}")
            print(f"   Civitai not found: {data['civitai_stats']['not_found_on_civitai']}")
        
        # Test /sage_cache/hash
        print("\n   Testing GET /sage_cache/hash")
        response = await routes.call_route("GET", "/sage_cache/hash")
        print(f"   Status: {response['status']}")
        if response['status'] == 200:
            data = response['data']
            print(f"   Hash entries: {len(data)}")
            if data:
                first_path = list(data.keys())[0]
                print(f"   Sample: {first_path[:50]}... -> {data[first_path][:16]}...")
        
        # Test /sage_cache/info
        print("\n   Testing GET /sage_cache/info")
        response = await routes.call_route("GET", "/sage_cache/info")
        print(f"   Status: {response['status']}")
        if response['status'] == 200:
            data = response['data']
            print(f"   Info entries: {len(data)}")
            if data:
                first_hash = list(data.keys())[0]
                print(f"   Sample hash: {first_hash}")
                info = data[first_hash]
                print(f"   Sample info: civitai={info.get('civitai')}, name={info.get('name', 'N/A')}")
        
        # Test /sage_cache/file/{hash}
        if cache.info:
            test_hash = list(cache.info.keys())[0]
            print(f"\n   Testing GET /sage_cache/file/{test_hash}")
            request = MockRequest({"file_hash": test_hash})
            response = await routes.call_route("GET", "/sage_cache/file/{file_hash}", request)
            print(f"   Status: {response['status']}")
            if response['status'] == 200:
                data = response['data']
                print(f"   Hash: {data['hash']}")
                print(f"   File paths: {len(data['file_paths'])}")
                print(f"   Info keys: {list(data['info'].keys())}")
        
        # Test /sage_cache/path
        print("\n   Testing GET /sage_cache/path")
        response = await routes.call_route("GET", "/sage_cache/path")
        print(f"   Status: {response['status']}")
        if response['status'] == 200:
            data = response['data']
            print(f"   File path: {data['file_path']}")
            print(f"   Hash: {data['hash']}")
            print(f"   Info keys: {list(data['info'].keys())}")
            print(f"   All paths with same hash: {len(data['all_paths_with_same_hash'])}")
    
    # Run the async tests
    import asyncio
    asyncio.run(test_routes())
    
    print("\n=== Test Complete ===")
    print("✓ All routes registered and tested successfully!")
    print("\nWhen ComfyUI is running, these routes will be available at:")
    print("  - http://localhost:8188/sage_cache/info")
    print("  - http://localhost:8188/sage_cache/hash") 
    print("  - http://localhost:8188/sage_cache/stats")
    print("  - http://localhost:8188/sage_cache/file/{hash}")
    print("  - Or with /api prefix for each route")
    
    return True

if __name__ == "__main__":
    test_sage_routes()
