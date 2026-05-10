"""Encryption helpers for sensitive SageUtils settings values."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from .logger import get_logger
from .path_manager import path_manager

logger = get_logger('settings.crypto')

try:
    from cryptography.fernet import Fernet, InvalidToken
except ImportError:  # pragma: no cover - handled at runtime when dependency is missing
    Fernet = None  # type: ignore[assignment]
    InvalidToken = Exception  # type: ignore[assignment]


ENC_PREFIX = 'enc:v1:'
KEY_FILENAME = '.settings_secret.key'
SENSITIVE_SETTING_KEYS = {
    'openai_api_key',
    'ollama_api_key',
    'lmstudio_api_token',
}


def is_sensitive_setting_key(key: str) -> bool:
    return key in SENSITIVE_SETTING_KEYS


def is_encrypted_value(value: Any) -> bool:
    return isinstance(value, str) and value.startswith(ENC_PREFIX)


def _get_or_create_key() -> bytes:
    if Fernet is None:
        raise RuntimeError(
            'cryptography is required for encrypted settings. Please install dependencies from requirements.txt.'
        )

    key_path: Path = path_manager.get_user_file_path(KEY_FILENAME)
    if key_path.is_file():
        key = key_path.read_bytes().strip()
        # Validate key format early.
        Fernet(key)
        return key

    key = Fernet.generate_key()
    key_path.write_bytes(key + b'\n')
    try:
        os.chmod(key_path, 0o600)
    except OSError:
        # Best effort: chmod may not be available/allowed on some platforms.
        pass
    logger.info('Created local settings encryption key.')
    return key


def encrypt_sensitive_value(key: str, value: Any) -> Any:
    if not is_sensitive_setting_key(key):
        return value
    if value is None:
        return ''

    plain_value = str(value)
    if not plain_value:
        return ''
    if is_encrypted_value(plain_value):
        return plain_value

    fernet = Fernet(_get_or_create_key())
    token = fernet.encrypt(plain_value.encode('utf-8')).decode('utf-8')
    return f'{ENC_PREFIX}{token}'


def decrypt_sensitive_value(key: str, value: Any) -> Any:
    if not is_sensitive_setting_key(key):
        return value
    if not isinstance(value, str) or not value:
        return value
    if not is_encrypted_value(value):
        return value

    token = value[len(ENC_PREFIX):]
    try:
        fernet = Fernet(_get_or_create_key())
        return fernet.decrypt(token.encode('utf-8')).decode('utf-8')
    except (InvalidToken, ValueError, RuntimeError) as e:
        logger.warning(f"Unable to decrypt setting '{key}': {e}. Using empty value.")
        return ''
