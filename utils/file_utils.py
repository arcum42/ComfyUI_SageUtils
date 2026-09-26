"""File and path utility helpers extracted from helpers.py."""

import datetime
import hashlib
import os
import pathlib

from .constants import MODEL_FILE_EXTENSIONS
from .logger import get_logger
from .model_cache import cache

logger = get_logger('utils.file_utils')


def name_from_path(path):
    return pathlib.Path(path).name


def get_path_without_base(folder_type: str, path: str) -> str:
    """Get the base path for a given folder type and path."""
    import folder_paths

    for base in folder_paths.get_folder_paths(folder_type):
        if path.startswith(base):
            path = path[len(base):].lstrip('/\\')
            break
    return path


def get_file_extension(path: str) -> str:
    """Get the file extension from a path."""
    return path.split('.')[-1] if '.' in path else ''


def has_model_extension(path: str) -> bool:
    """Check if a file path has a model extension."""
    if not path:
        return False
    extension = '.' + get_file_extension(path).lower()
    return extension in {ext.lower() for ext in MODEL_FILE_EXTENSIONS}


def is_model_file(path: str) -> bool:
    """Check if a file is a valid model file based on its extension."""
    return has_model_extension(path)


def get_file_fingerprint(path):
    """Return cheap filesystem identity data without reading file contents."""
    file_stat = pathlib.Path(path).stat()
    return {
        'size': file_stat.st_size,
        'mtime_ns': file_stat.st_mtime_ns,
    }


def file_fingerprint_matches(path, fingerprint):
    """Return whether a stored fingerprint still describes the local file."""
    if not isinstance(fingerprint, dict):
        return False

    try:
        current = get_file_fingerprint(path)
    except (OSError, ValueError):
        return False

    return (
        current.get('size') == fingerprint.get('size')
        and current.get('mtime_ns') == fingerprint.get('mtime_ns')
    )


# fast_hash_threshold=100*1024*1024  # 100MB threshold
def get_file_sha256(path, fast_hash_threshold=0):  # Full hashing by default
    """Calculate SHA256 hash of a file with optimizations for large files."""
    logger.debug(f'Calculating hash for {path}')

    buffer_size = 65536  # 64KB chunks

    try:
        file_size = os.path.getsize(path)
        logger.debug(f'File size: {file_size / (1024*1024):.1f} MB')

        m = hashlib.sha256()

        if fast_hash_threshold > 0 and file_size > fast_hash_threshold:
            logger.debug('Large file detected, using fast hashing strategy')
            sample_size = min(buffer_size * 4, file_size // 10)

            with open(path, 'rb') as f:
                m.update(str(file_size).encode())
                m.update(os.path.basename(path).encode())

                beginning = f.read(sample_size)
                m.update(beginning)

                if file_size > sample_size * 2:
                    middle_pos = file_size // 2 - sample_size // 2
                    f.seek(middle_pos)
                    middle = f.read(sample_size)
                    m.update(middle)

                if file_size > sample_size * 3:
                    f.seek(-sample_size, 2)
                    end = f.read(sample_size)
                    m.update(end)
        else:
            with open(path, 'rb') as f:
                while True:
                    chunk = f.read(buffer_size)
                    if not chunk:
                        break
                    m.update(chunk)

    except (OSError, IOError) as e:
        logger.error(f'Error reading file {path}: {e}')
        raise

    full_hash = m.hexdigest()
    logger.debug(f'Calculated hash: {full_hash[:10]}')
    return full_hash[:10]


def get_file_sha256_full(path, progress_callback=None):
    """Calculate and return the complete SHA-256 digest for a file."""
    logger.debug(f'Calculating full SHA-256 for {path}')
    digest = hashlib.sha256()
    file_size = os.path.getsize(path)
    bytes_read = 0

    with open(path, 'rb') as file_obj:
        for chunk in iter(lambda: file_obj.read(65536), b''):
            digest.update(chunk)
            bytes_read += len(chunk)
            if progress_callback is not None and file_size:
                progress_callback(bytes_read / file_size)

    return digest.hexdigest()


def get_files_in_dir(input_dirs=None, extensions=None):
    if extensions is None or extensions in ('*', '.*'):
        allowed_extensions = None
    elif isinstance(extensions, str):
        allowed_extensions = {extensions.lower()}
    else:
        allowed_extensions = {ext.lower() for ext in extensions}

    if input_dirs is None:
        raise ValueError('input_dirs cannot be None')

    input_files = []
    if not isinstance(input_dirs, (list, tuple)):
        input_dirs = [input_dirs]

    for directory in input_dirs:
        if directory is None or directory == '':
            continue
        if pathlib.Path(directory).exists():
            file_list = pathlib.Path(directory).rglob('*')
            for file in file_list:
                if file.exists() and not file.is_dir():
                    if allowed_extensions is not None and file.suffix.lower() not in allowed_extensions:
                        continue

                    try:
                        file_path = str(file.relative_to(directory))
                    except ValueError:
                        file_path = str(file)

                    input_files.append(file_path)

    input_files = sorted(set(input_files))
    return input_files


def last_used(file_path):
    cache.load()

    if file_path in cache.hash:
        value = cache.by_path(file_path).get('lastUsed', None)
        if value is not None:
            return datetime.datetime.fromisoformat(value)
        return None
    return None


def days_since_last_used(file_path):
    was_last_used = last_used(file_path)
    if was_last_used is not None:
        now = datetime.datetime.now()
        delta = now - was_last_used
        return delta.days
    return 365


def get_file_modification_date(file_path):
    try:
        file_path = pathlib.Path(file_path)
        if file_path.exists():
            return datetime.datetime.fromtimestamp(file_path.stat().st_mtime)
        logger.warning(f'File {file_path} does not exist.')
        return datetime.datetime.now()
    except Exception as e:
        logger.error(f'Error getting modification date for {file_path}: {e}')
        return datetime.datetime.now()
