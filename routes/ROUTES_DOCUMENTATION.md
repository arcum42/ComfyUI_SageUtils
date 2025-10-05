# SageUtils Routes Documentation & Overhaul Plan

This document provides comprehensive documentation of the current SageUtils API routes and outlines a plan for reorganizing them into a more logical structure.

## Current Route Structure

### Routes in `server_routes.py` (Legacy)

These routes are currently defined in the main server_routes.py file:

#### Settings Management

- `GET /sage_utils/settings` - Get all settings with values and schema
- `POST /sage_utils/settings` - Update settings with JSON body
- `POST /sage_utils/settings/reset` - Reset all settings to defaults

#### Cache Information

- `GET /sage_cache/info` - Get cache.info contents (model metadata)
- `GET /sage_cache/hash` - Get cache.hash contents (file path to hash mapping)
- `GET /sage_cache/stats` - Get cache statistics
- `GET /sage_cache/file/{file_hash}` - Get info for specific file hash
- `GET /sage_cache/path?file_path=<path>` - Get info for file by path

#### Cache Management

- `POST /sage_utils/pull_metadata` - Pull metadata for specific file
- `POST /sage_utils/update_cache_info` - Update cache info for hash
- `GET /sage_utils/cache_info_images?hash=<hash>` - Get Civitai images for hash
- `GET /sage_utils/file_size?path=<path>` - Get file size for path

### Routes in `routes/` Module (New Modular System)

#### Settings Routes (`settings_routes.py`)

- `GET /sage_utils/settings` - Get all settings
- `POST /sage_utils/settings` - Update settings
- `POST /sage_utils/settings/reset` - Reset settings to defaults

#### Cache Routes (`cache_routes.py`)

- `GET /sage_cache/info` - Get cache info
- `GET /sage_cache/hash` - Get cache hash mapping
- `GET /sage_cache/stats` - Get cache statistics
- `GET /sage_cache/file/{file_hash}` - Get info for specific file hash
- `GET /sage_cache/path` - Get info for file by path
- `POST /sage_utils/pull_metadata` - Pull metadata for file
- `POST /sage_utils/update_cache_info` - Update cache info
- `GET /sage_utils/cache_info_images` - Get Civitai images for hash

#### Scanning Routes (`scanning_routes.py`)

- `GET /sage_cache/scan_model_folders` - Get available model folders to scan
- `POST /sage_cache/scan_model_folders` - Start model scanning
- `GET /sage_cache/scan_progress` - Get real-time scan progress
- `POST /sage_cache/cancel_scan` - Cancel active scan

#### Notes Routes (`notes_routes.py`)

- `GET /sage_utils/list_notes` - List all notes files
- `POST /sage_utils/read_note` - Read note content as JSON
- `GET /sage_utils/read_note?filename=<name>` - Serve note file directly
- `POST /sage_utils/save_note` - Save note content
- `POST /sage_utils/delete_note` - Delete note file

#### Gallery Routes (`gallery_routes.py`)

- `POST /sage_utils/civitai_images` - Fetch images from CivitAI API
- `POST /sage_utils/list_images` - List images in folders
- `POST /sage_utils/thumbnail` - Generate and serve thumbnails
- `POST /sage_utils/image_metadata` - Extract image metadata
- `POST /sage_utils/check_dataset_text` - Check if text file exists for image
- `POST /sage_utils/read_dataset_text` - Read dataset text file
- `POST /sage_utils/save_dataset_text` - Save dataset text file
- `POST /sage_utils/browse_folder` - Browse and validate folder path
- `POST /sage_utils/browse_directory_tree` - Browse directory tree
- `POST /sage_utils/copy_image` - Copy image to clipboard
- `POST /sage_utils/image` - Serve full resolution image

#### Wildcard Routes (`wildcard_routes.py`)

- `GET /sage_utils/wildcard_path` - Get wildcard directory path
- `GET /sage_utils/wildcard_files` - List wildcard files and directories
- `POST /sage_utils/generate_wildcard` - Generate prompt using wildcards
- `GET /sage_utils/wildcard_file/{filename:.*}` - Get wildcard file content
- `POST /sage_utils/wildcard/file/save` - Save wildcard file content

#### Utility Routes (`utility_routes.py`)

- `GET /sage_utils/file_size` - Get file size for given path
- `POST /sage_utils/timing_data` - Receive timing data from frontend
- `GET /sage_utils/timing_report` - Get combined timing report

## Issues with Current Structure

1. **Inconsistent URL patterns**: Mix of `/sage_utils/` and `/sage_cache/` prefixes
2. **No logical grouping**: Related endpoints are scattered across different base paths
3. **HTTP method inconsistency**: Some GET operations that should be GET are POST
4. **Duplicate functionality**: Some routes exist in both legacy and new systems
5. **No versioning**: API changes could break existing clients
6. **Mixed concerns**: Cache operations mixed with UI operations

## Proposed Route Overhaul Plan

### New URL Structure: `/sage_utils/api/v1/<category>/<action>`

#### 1. Settings API

```http
GET    /sage_utils/api/v1/settings                    # Get all settings
POST   /sage_utils/api/v1/settings                    # Update settings
POST   /sage_utils/api/v1/settings/reset              # Reset settings
GET    /sage_utils/api/v1/settings/schema             # Get settings schema
```

#### 2. Cache API

```http
GET    /sage_utils/api/v1/cache/info                  # Get cache info
GET    /sage_utils/api/v1/cache/hash                  # Get hash mapping
GET    /sage_utils/api/v1/cache/stats                 # Get cache statistics
GET    /sage_utils/api/v1/cache/files/{hash}          # Get info by hash
GET    /sage_utils/api/v1/cache/files/by-path         # Get info by path (?path=...)
POST   /sage_utils/api/v1/cache/files/pull-metadata   # Pull metadata for file
PUT    /sage_utils/api/v1/cache/files/{hash}          # Update cache info
GET    /sage_utils/api/v1/cache/files/{hash}/images   # Get Civitai images
POST   /sage_utils/api/v1/cache/clear                 # Clear cache
POST   /sage_utils/api/v1/cache/rebuild               # Rebuild cache
```

#### 3. Scanning API

```http
GET    /sage_utils/api/v1/scanning/folders            # Get available folders
POST   /sage_utils/api/v1/scanning/start              # Start scan
GET    /sage_utils/api/v1/scanning/progress           # Get scan progress
POST   /sage_utils/api/v1/scanning/cancel             # Cancel scan
GET    /sage_utils/api/v1/scanning/history            # Get scan history
```

#### 4. Notes API

```http
GET    /sage_utils/api/v1/notes                       # List all notes
GET    /sage_utils/api/v1/notes/{filename}            # Get note content
POST   /sage_utils/api/v1/notes                       # Create new note
PUT    /sage_utils/api/v1/notes/{filename}            # Update note
DELETE /sage_utils/api/v1/notes/{filename}            # Delete note
POST   /sage_utils/api/v1/notes/{filename}/duplicate  # Duplicate note
```

#### 5. Gallery API

```http
GET    /sage_utils/api/v1/gallery/images              # List images (?folder=..&path=..)
GET    /sage_utils/api/v1/gallery/images/{id}/thumbnail # Get thumbnail (?size=..)
GET    /sage_utils/api/v1/gallery/images/{id}/metadata  # Get image metadata
GET    /sage_utils/api/v1/gallery/folders             # Browse directory tree
POST   /sage_utils/api/v1/gallery/folders/validate    # Validate folder path
GET    /sage_utils/api/v1/gallery/civitai/{hash}      # Get CivitAI images by hash
```

#### 6. Dataset API (for image annotation)

```http
GET    /sage_utils/api/v1/dataset/{image_id}/text     # Get dataset text
POST   /sage_utils/api/v1/dataset/{image_id}/text     # Save dataset text
DELETE /sage_utils/api/v1/dataset/{image_id}/text     # Delete dataset text
GET    /sage_utils/api/v1/dataset/{image_id}/exists   # Check if text exists
```

#### 7. Wildcard API

```http
GET    /sage_utils/api/v1/wildcards/config            # Get wildcard config
GET    /sage_utils/api/v1/wildcards/files             # List wildcard files (?path=..)
GET    /sage_utils/api/v1/wildcards/files/{path:.*}   # Get wildcard file content
POST   /sage_utils/api/v1/wildcards/files/{path:.*}   # Save wildcard file
DELETE /sage_utils/api/v1/wildcards/files/{path:.*}   # Delete wildcard file
POST   /sage_utils/api/v1/wildcards/generate          # Generate wildcard prompt
```

#### 8. System API

```http
GET    /sage_utils/api/v1/system/status               # Get system status
GET    /sage_utils/api/v1/system/version              # Get version info
GET    /sage_utils/api/v1/system/timing               # Get performance timing
POST   /sage_utils/api/v1/system/timing               # Submit timing data
GET    /sage_utils/api/v1/system/health               # Health check
```

#### 9. Files API (for direct file serving)

```http
GET    /sage_utils/files/notes/{filename}             # Serve note file directly
GET    /sage_utils/files/images/{path:.*}             # Serve image file
GET    /sage_utils/files/thumbnails/{path:.*}         # Serve thumbnail
POST   /sage_utils/files/upload                       # Upload file
```

### Benefits of New Structure

1. **Logical Grouping**: Related endpoints are grouped by functionality
2. **Consistent Patterns**: All API routes follow the same pattern
3. **HTTP Method Compliance**: Proper use of GET/POST/PUT/DELETE
4. **Versioning**: API versioning prevents breaking changes
5. **Clear Separation**: API routes vs file serving routes
6. **RESTful Design**: Follows REST principles for resource management
7. **Extensibility**: Easy to add new categories and endpoints

### Migration Strategy

#### Phase 1: Implement New Routes (Parallel)

- Create new route handlers following the new structure
- Keep existing routes functional for backward compatibility
- Add deprecation warnings to old routes

#### Phase 2: Update Frontend

- Update JavaScript code to use new API endpoints
- Implement feature detection to use new routes when available
- Add error handling for route migration

#### Phase 3: Documentation & Testing

- Update API documentation
- Create comprehensive test suite for new routes
- Performance testing and optimization

#### Phase 4: Deprecation

- Mark old routes as deprecated in responses
- Provide migration guide for external users
- Set timeline for old route removal

#### Phase 5: Cleanup

- Remove old route implementations
- Clean up legacy code
- Update all documentation

### Implementation Details

#### Route Handler Organization

```text
routes/
├── __init__.py                 # Route registration system
├── base.py                     # Shared utilities and decorators
├── v1/
│   ├── __init__.py            # V1 route registration
│   ├── settings.py            # Settings API v1
│   ├── cache.py               # Cache API v1
│   ├── scanning.py            # Scanning API v1
│   ├── notes.py               # Notes API v1
│   ├── gallery.py             # Gallery API v1
│   ├── dataset.py             # Dataset API v1
│   ├── wildcards.py           # Wildcard API v1
│   ├── system.py              # System API v1
│   └── files.py               # File serving v1
├── legacy/
│   ├── __init__.py            # Legacy route support
│   └── server_routes.py       # Original routes with deprecation
└── middleware/
    ├── __init__.py            # Middleware system
    ├── auth.py                # Authentication middleware
    ├── rate_limit.py          # Rate limiting
    ├── logging.py             # Request logging
    └── cors.py                # CORS handling
```

#### Response Standardization

All API responses will follow a consistent format:

```json
{
  "success": true|false,
  "data": { ... },              // For successful responses
  "error": "error message",     // For error responses
  "meta": {                     // Metadata
    "version": "v1",
    "timestamp": "2025-09-14T...",
    "request_id": "uuid"
  }
}
```

#### Error Handling

Standardized error codes and messages:

- 400: Bad Request (invalid parameters)
- 401: Unauthorized (authentication required)
- 403: Forbidden (insufficient permissions)
- 404: Not Found (resource doesn't exist)
- 409: Conflict (resource conflict)
- 422: Unprocessable Entity (validation error)
- 429: Too Many Requests (rate limited)
- 500: Internal Server Error (server error)
- 503: Service Unavailable (service down)

This overhaul will provide a much more maintainable, extensible, and user-friendly API structure while maintaining backward compatibility during the transition period.
