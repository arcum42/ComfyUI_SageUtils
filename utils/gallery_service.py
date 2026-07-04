"""
Gallery service helpers for SageUtils.

This module contains reusable gallery operations that are independent of HTTP route handling.
It is intended to keep routes thin and make gallery behavior easier to test.
"""

import hashlib
import io
import json
import os
import platform
import tempfile
import time
import pathlib
from typing import Any, Dict, List, Optional

from .logger import get_logger
from .path_manager import path_manager

try:
    from PIL import Image, ExifTags
except ImportError:  # pragma: no cover
    raise

logger = get_logger('utils.gallery_service')

IMAGE_EXTENSIONS = {
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg',
    '.tiff', '.tif', '.ico', '.heic', '.heif', '.avif',
    '.raw', '.cr2', '.nef', '.arw', '.dng', '.orf',
    '.pef', '.sr2', '.srw', '.x3f'
}

THUMBNAIL_SIZES = {
    'small': (120, 120),
    'medium': (200, 200),
    'large': (300, 300)
}

GENERATION_PARAM_KEYS = {'parameters', 'prompt', 'workflow', 'comfyui'}

RESTRICTED_PATHS_WINDOWS = {
    'C:\\Windows\\System32',
    'C:\\Windows\\SysWOW64',
    'C:\\$Recycle.Bin',
    'C:\\System Volume Information'
}

RESTRICTED_PATHS_UNIX = {
    '/proc', '/sys', '/dev', '/run', '/tmp/.X11-unix'
}


def _format_file_size(size_bytes: int) -> str:
    if size_bytes == 0:
        return '0 B'
    size_names = ['B', 'KB', 'MB', 'GB', 'TB']
    i = int(__import__('math').floor(__import__('math').log(size_bytes, 1024)))
    p = __import__('math').pow(1024, i)
    s = round(size_bytes / p, 2)
    return f'{s} {size_names[i]}'


def _resolve_path(path_str: str) -> pathlib.Path:
    if not path_str:
        raise ValueError('Path is required')
    path = pathlib.Path(path_str).expanduser().resolve()
    return path


def _validate_image_file(image_path: pathlib.Path) -> None:
    if not image_path.exists() or not image_path.is_file():
        raise FileNotFoundError(f'Image not found: {image_path}')
    if image_path.suffix.lower() not in IMAGE_EXTENSIONS:
        raise ValueError('Unsupported image type')


def _resolve_folder(folder_type: str, custom_path: Optional[str] = None) -> pathlib.Path:
    if folder_type == 'notes':
        return path_manager.notes_path
    if folder_type == 'input':
        import folder_paths
        return pathlib.Path(folder_paths.get_input_directory())
    if folder_type == 'output':
        import folder_paths
        return pathlib.Path(folder_paths.get_output_directory())
    if folder_type == 'custom':
        if not custom_path:
            raise ValueError('Custom path is required for custom folder type')
        custom_folder = _resolve_path(custom_path)
        if not custom_folder.exists() or not custom_folder.is_dir():
            raise FileNotFoundError(f'Path does not exist or is not a directory: {custom_path}')
        return custom_folder
    raise ValueError(f'Invalid folder type: {folder_type}')


def _extract_metadata_value(value: Any) -> Any:
    try:
        if isinstance(value, bytes):
            try:
                return value.decode('utf-8')
            except UnicodeDecodeError:
                return value.decode('latin-1', errors='replace')

        if isinstance(value, dict):
            return {str(k): _extract_metadata_value(v) for k, v in value.items()}

        if isinstance(value, (list, tuple)):
            return [_extract_metadata_value(v) for v in value]

        if hasattr(value, 'numerator') and hasattr(value, 'denominator'):
            if value.denominator == 0:
                return 'undefined'
            return float(value.numerator) / float(value.denominator)

        if isinstance(value, (str, int, float, bool, type(None))):
            return value

        return str(value)
    except Exception:
        return str(value)


def _extract_generation_params(img: Image.Image, metadata: Dict[str, Any]) -> None:
    if hasattr(img, 'text') and img.text:
        for key, value in img.text.items():
            lower_key = key.lower()
            if lower_key in GENERATION_PARAM_KEYS or any(k in lower_key for k in GENERATION_PARAM_KEYS):
                try:
                    metadata['generation_params'][key] = json.loads(value)
                except (json.JSONDecodeError, TypeError):
                    metadata['generation_params'][key] = _extract_metadata_value(value)

    if hasattr(img, 'info') and img.info:
        for key, value in img.info.items():
            if key not in metadata['generation_params']:
                metadata['generation_params'][key] = _extract_metadata_value(value)


def list_images(folder_type: str, custom_path: Optional[str] = None) -> Dict[str, Any]:
    base_path = _resolve_folder(folder_type, custom_path)
    if not base_path.exists():
        return {
            'images': [],
            'folders': [],
            'folder': folder_type,
            'path': str(base_path),
            'image_count': 0,
            'folder_count': 0
        }

    images = []
    folders = []
    for item in sorted(base_path.iterdir(), key=lambda p: p.name.lower()):
        try:
            if item.is_file() and item.suffix.lower() in IMAGE_EXTENSIONS:
                stat = item.stat()
                dimensions = None
                try:
                    with Image.open(item) as img:
                        dimensions = {'width': img.width, 'height': img.height}
                except Exception:
                    dimensions = None

                images.append({
                    'filename': item.name,
                    'path': str(item),
                    'relative_path': str(item.relative_to(base_path)),
                    'size': stat.st_size,
                    'modified': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(stat.st_mtime)),
                    'dimensions': dimensions
                })
            elif item.is_dir():
                stat = item.stat()
                folders.append({
                    'name': item.name,
                    'path': str(item),
                    'relative_path': str(item.relative_to(base_path)),
                    'modified': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(stat.st_mtime)),
                    'type': 'folder'
                })
        except (OSError, PermissionError):
            continue

    return {
        'images': images,
        'folders': folders,
        'folder': folder_type,
        'path': str(base_path),
        'image_count': len(images),
        'folder_count': len(folders)
    }


def get_thumbnail_bytes(image_path_str: str, size_param: str = 'medium') -> bytes:
    image_path = _resolve_path(image_path_str)
    _validate_image_file(image_path)

    size = THUMBNAIL_SIZES.get(size_param, THUMBNAIL_SIZES['medium'])
    cache_dir = pathlib.Path(tempfile.gettempdir()) / 'sageutils_thumbnails'
    cache_dir.mkdir(parents=True, exist_ok=True)

    stat = image_path.stat()
    cache_key = hashlib.md5(f'{image_path}_{size}_{stat.st_mtime}'.encode('utf-8')).hexdigest()
    cache_file = cache_dir / f'{cache_key}.jpg'

    if cache_file.exists():
        return cache_file.read_bytes()

    with Image.open(image_path) as img:
        if img.mode in ('RGBA', 'LA', 'P'):
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')

        img.thumbnail(size, Image.Resampling.LANCZOS)
        output = io.BytesIO()
        img.save(output, format='JPEG', quality=85, optimize=True)
        thumbnail_data = output.getvalue()

    try:
        cache_file.write_bytes(thumbnail_data)
    except Exception:
        logger.debug('Failed to write thumbnail cache', exc_info=True)

    return thumbnail_data


def get_image_metadata(image_path_str: str) -> Dict[str, Any]:
    image_path = _resolve_path(image_path_str)
    _validate_image_file(image_path)

    metadata = {
        'file_info': {},
        'exif': {},
        'generation_params': {}
    }

    stat = image_path.stat()
    metadata['file_info'] = {
        'filename': image_path.name,
        'path': str(image_path),
        'size': stat.st_size,
        'size_human': _format_file_size(stat.st_size),
        'created': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(stat.st_ctime)),
        'modified': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(stat.st_mtime)),
        'extension': image_path.suffix.lower()
    }

    with Image.open(image_path) as img:
        metadata['file_info']['dimensions'] = {'width': img.width, 'height': img.height}
        metadata['file_info']['format'] = img.format
        metadata['file_info']['mode'] = img.mode

        if hasattr(img, '_getexif') and img._getexif() is not None:
            for tag_id, value in img._getexif().items():
                tag = ExifTags.TAGS.get(tag_id, tag_id)
                metadata['exif'][tag] = _extract_metadata_value(value)

        _extract_generation_params(img, metadata)

    return _extract_metadata_value(metadata)


def _image_to_text_path(image_path: pathlib.Path) -> pathlib.Path:
    return image_path.with_suffix('.txt')


def check_dataset_text(image_path_str: str) -> Dict[str, Any]:
    image_path = _resolve_path(image_path_str)
    _validate_image_file(image_path)
    text_path = _image_to_text_path(image_path)
    return {
        'exists': text_path.exists(),
        'text_path': str(text_path),
        'image_path': str(image_path)
    }


def read_dataset_text(image_path_str: str) -> Dict[str, Any]:
    image_path = _resolve_path(image_path_str)
    _validate_image_file(image_path)
    text_path = _image_to_text_path(image_path)
    if not text_path.exists():
        raise FileNotFoundError('Text file not found')

    try:
        content = text_path.read_text(encoding='utf-8')
    except UnicodeDecodeError:
        content = text_path.read_text(encoding='latin-1', errors='replace')

    return {'content': content, 'text_path': str(text_path), 'image_path': str(image_path)}


def save_dataset_text(image_path_str: str, content: str) -> Dict[str, Any]:
    image_path = _resolve_path(image_path_str)
    _validate_image_file(image_path)
    text_path = _image_to_text_path(image_path)
    if text_path.parent != image_path.parent:
        raise ValueError('Invalid file path')

    text_path.write_text(content, encoding='utf-8')
    return {'message': 'Text file saved successfully', 'text_path': str(text_path), 'image_path': str(image_path)}


def browse_folder(path_str: str) -> Dict[str, Any]:
    folder_path = _resolve_path(path_str)
    if not folder_path.exists():
        raise FileNotFoundError('Path does not exist')
    if not folder_path.is_dir():
        raise ValueError('Path is not a directory')

    try:
        _ = list(folder_path.iterdir())
        accessible = True
    except PermissionError:
        accessible = False

    image_count = 0
    if accessible:
        try:
            for file_path in folder_path.rglob('*'):
                if file_path.is_file() and file_path.suffix.lower() in IMAGE_EXTENSIONS:
                    image_count += 1
        except (PermissionError, OSError):
            image_count = -1

    return {
        'valid': True,
        'accessible': accessible,
        'image_count': image_count,
        'path': str(folder_path)
    }


def browse_directory_tree(current_path_str: Optional[str] = None, max_depth: int = 2) -> Dict[str, Any]:
    if not current_path_str:
        current_path_str = os.path.expanduser('~')

    if platform.system() == 'Windows':
        current_path_str = os.path.expandvars(current_path_str)
        current_path = pathlib.WindowsPath(current_path_str).resolve()
        restricted_paths = RESTRICTED_PATHS_WINDOWS
    else:
        current_path = pathlib.PosixPath(current_path_str).expanduser().resolve()
        restricted_paths = RESTRICTED_PATHS_UNIX

    path_str = str(current_path)
    if any(path_str.startswith(restricted) for restricted in restricted_paths):
        current_path = pathlib.Path.home()

    while not current_path.exists() and current_path != current_path.parent:
        current_path = current_path.parent
    if not current_path.exists():
        current_path = pathlib.Path.home()
    if not current_path.is_dir():
        current_path = current_path.parent

    directories: List[Dict[str, Any]] = []
    if current_path != current_path.parent:
        directories.append({
            'name': '..',
            'path': str(current_path.parent),
            'type': 'parent',
            'accessible': True,
            'image_count': 0
        })

    for item in sorted(current_path.iterdir(), key=lambda p: p.name.lower()):
        if not item.is_dir():
            continue
        try:
            accessible = True
            image_count = 0
            try:
                for file_item in item.iterdir():
                    if file_item.is_file() and file_item.suffix.lower() in IMAGE_EXTENSIONS:
                        image_count += 1
                        if image_count >= 10:
                            break
            except (PermissionError, OSError):
                accessible = False
                image_count = -1
            directories.append({
                'name': item.name,
                'path': str(item),
                'type': 'directory',
                'accessible': accessible,
                'image_count': image_count if image_count >= 0 else 'Unknown'
            })
        except (OSError, PermissionError):
            continue

    return {
        'current_path': str(current_path),
        'directories': directories,
        'total_directories': len([d for d in directories if d['type'] == 'directory'])
    }


def copy_image_to_clipboard(image_path_str: str) -> Dict[str, Any]:
    image_path = _resolve_path(image_path_str)
    _validate_image_file(image_path)

    system = platform.system().lower()
    if system == 'windows':
        powershell_script = f'''
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$image = [System.Drawing.Image]::FromFile("{image_path}")
[System.Windows.Forms.Clipboard]::SetImage($image)
$image.Dispose()
'''
        result = __import__('subprocess').run(
            ['powershell', '-Command', powershell_script],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode != 0:
            raise RuntimeError(f'PowerShell error: {result.stderr}')
        return {'message': 'Image copied to clipboard'}

    if system == 'darwin':
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as temp_file:
            temp_path = temp_file.name
        try:
            with Image.open(image_path) as img:
                img.save(temp_path, 'PNG')
            result = __import__('subprocess').run([
                'osascript', '-e',
                f'set the clipboard to (read file POSIX file "{temp_path}" as «class PNGf»)' 
            ], capture_output=True, text=True, timeout=10)
            if result.returncode != 0:
                raise RuntimeError(f'macOS clipboard error: {result.stderr}')
            return {'message': 'Image copied to clipboard'}
        finally:
            try:
                os.unlink(temp_path)
            except Exception:
                pass

    if system == 'linux':
        which = __import__('subprocess').run
        result = which(['which', 'xclip'], capture_output=True, timeout=5)
        if result.returncode == 0:
            with open(image_path, 'rb') as img_file:
                which(['xclip', '-selection', 'clipboard', '-t', 'image/png'], input=img_file.read(), timeout=10)
            return {'message': 'Image copied to clipboard'}
        result = which(['which', 'xsel'], capture_output=True, timeout=5)
        if result.returncode == 0:
            with open(image_path, 'rb') as img_file:
                which(['xsel', '--clipboard', '--input'], input=img_file.read(), timeout=10)
            return {'message': 'Image copied to clipboard'}
        raise RuntimeError('No clipboard utility found (xclip or xsel required)')

    raise RuntimeError(f'Clipboard operations not supported on {system}')


def get_full_image_bytes(image_path_str: str) -> Dict[str, Any]:
    image_path = _resolve_path(image_path_str)
    _validate_image_file(image_path)

    content_type_map = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.bmp': 'image/bmp',
        '.webp': 'image/webp',
        '.tiff': 'image/tiff',
        '.tif': 'image/tiff'
    }
    ext = image_path.suffix.lower()
    if ext not in content_type_map:
        raise ValueError('Not an image file')

    return {
        'body': image_path.read_bytes(),
        'content_type': content_type_map[ext]
    }


def find_duplicates(folder_path_str: str, include_subfolders: bool = False) -> Dict[str, Any]:
    folder_path = _resolve_path(folder_path_str)
    if not folder_path.exists() or not folder_path.is_dir():
        raise FileNotFoundError('Folder not found or is not a directory')

    image_files = []
    if include_subfolders:
        image_files = [f for f in folder_path.rglob('*') if f.is_file() and f.suffix.lower() in IMAGE_EXTENSIONS]
    else:
        image_files = [f for f in folder_path.iterdir() if f.is_file() and f.suffix.lower() in IMAGE_EXTENSIONS]

    hash_map: Dict[str, List[Dict[str, Any]]] = {}
    for image_file in image_files:
        try:
            hasher = hashlib.md5()
            with open(image_file, 'rb') as f:
                for chunk in iter(lambda: f.read(8192), b''):
                    hasher.update(chunk)
            file_hash = hasher.hexdigest()
            stat = image_file.stat()
            image_info = {
                'path': str(image_file),
                'filename': image_file.name,
                'size': stat.st_size,
                'size_human': _format_file_size(stat.st_size),
                'hash': file_hash
            }
            hash_map.setdefault(file_hash, []).append(image_info)
        except (OSError, PermissionError):
            continue

    duplicate_groups = [group for group in hash_map.values() if len(group) > 1]
    total_duplicates = sum(len(group) - 1 for group in duplicate_groups)
    return {
        'duplicates': duplicate_groups,
        'total_images': len(image_files),
        'total_duplicates': total_duplicates,
        'duplicate_groups': len(duplicate_groups)
    }


def delete_images(image_paths: List[str]) -> Dict[str, Any]:
    deleted_count = 0
    failed_count = 0
    errors = []

    for image_path_str in image_paths:
        try:
            image_path = _resolve_path(image_path_str)
            if not image_path.exists():
                errors.append({'path': image_path_str, 'error': 'File not found'})
                failed_count += 1
                continue
            if not image_path.is_file():
                errors.append({'path': image_path_str, 'error': 'Path is not a file'})
                failed_count += 1
                continue
            image_path.unlink()
            deleted_count += 1
        except PermissionError:
            errors.append({'path': image_path_str, 'error': 'Permission denied'})
            failed_count += 1
        except Exception as exc:
            errors.append({'path': image_path_str, 'error': str(exc)})
            failed_count += 1

    return {'deleted': deleted_count, 'failed': failed_count, 'errors': errors}
