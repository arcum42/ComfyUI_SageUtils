"""Encryption helpers for sensitive SageUtils settings values.

Encryption scheme (enc:v2):
  - Key: 32 random bytes stored as 64 hex chars in the key file.
  - Encrypt: blake3 stream cipher (keyed XOF, domain-separated with 0x00 prefix)
    XOR'd with plaintext, then authenticated with a blake3 MAC (0x01 prefix).
  - Wire format: base64url(nonce[16] + mac[32] + ciphertext)
  - Stored as: "enc:v2:<base64url>"

Legacy enc:v1: values were encrypted with Fernet (cryptography library).
They cannot be decrypted without that library; the user will be prompted to
re-enter the value.
"""

from __future__ import annotations

import base64
import os
from pathlib import Path
from typing import Any

from .logger import get_logger
from .path_manager import path_manager

logger = get_logger('settings.crypto')

try:
    import blake3 as _blake3
    _BLAKE3_AVAILABLE = True
except ImportError:  # pragma: no cover
    _BLAKE3_AVAILABLE = False

_V1_PREFIX = 'enc:v1:'
_V2_PREFIX = 'enc:v2:'
ENC_PREFIX = _V2_PREFIX  # current active prefix
KEY_FILENAME = '.settings_secret.key'
SENSITIVE_SETTING_KEYS = {
    'openai_api_key',
    'ollama_api_key',
    'lmstudio_api_token',
}

_NONCE_LEN = 16
_MAC_LEN = 32
_KEY_LEN = 32  # bytes; stored as 64 hex chars in the key file


def is_sensitive_setting_key(key: str) -> bool:
    return key in SENSITIVE_SETTING_KEYS


def is_encrypted_value(value: Any) -> bool:
    return isinstance(value, str) and (
        value.startswith(_V1_PREFIX) or value.startswith(_V2_PREFIX)
    )


def _get_or_create_key() -> bytes:
    if not _BLAKE3_AVAILABLE:
        raise RuntimeError(
            'blake3 is required for encrypted settings. It is bundled with ComfyUI.'
        )

    key_path: Path = path_manager.get_user_file_path(KEY_FILENAME)
    if key_path.is_file():
        raw = key_path.read_bytes().strip()
        # Expect 64 hex chars encoding 32 bytes.  Old Fernet keys are 44 chars;
        # if we encounter one (or anything else invalid) we replace it.
        if len(raw) == 64:
            try:
                key = bytes.fromhex(raw.decode('ascii'))
                if len(key) == _KEY_LEN:
                    return key
            except (ValueError, UnicodeDecodeError):
                pass
        logger.info('Replacing old or invalid settings key with new blake3 key.')

    key = os.urandom(_KEY_LEN)
    key_path.write_bytes(key.hex().encode('ascii') + b'\n')
    try:
        os.chmod(key_path, 0o600)
    except OSError:
        # Best effort: chmod may not be available on all platforms.
        pass
    logger.info('Created local settings encryption key.')
    return key


def _constant_time_compare(a: bytes, b: bytes) -> bool:
    if len(a) != len(b):
        return False
    result = 0
    for x, y in zip(a, b):
        result |= x ^ y
    return result == 0


def _encrypt_bytes(key: bytes, plaintext: bytes) -> bytes:
    """Return nonce + mac + ciphertext using blake3 stream cipher + MAC."""
    nonce = os.urandom(_NONCE_LEN)
    # 0x00 prefix: keystream domain; 0x01 prefix: MAC domain.
    keystream = _blake3.blake3(b'\x00' + nonce, key=key).digest(length=len(plaintext))
    ciphertext = bytes(p ^ k for p, k in zip(plaintext, keystream))
    mac = _blake3.blake3(b'\x01' + nonce + ciphertext, key=key).digest(length=_MAC_LEN)
    return nonce + mac + ciphertext


def _decrypt_bytes(key: bytes, data: bytes) -> bytes:
    """Decrypt data from _encrypt_bytes. Raises ValueError on auth failure."""
    if len(data) < _NONCE_LEN + _MAC_LEN:
        raise ValueError('Encrypted data too short.')
    nonce = data[:_NONCE_LEN]
    mac = data[_NONCE_LEN:_NONCE_LEN + _MAC_LEN]
    ciphertext = data[_NONCE_LEN + _MAC_LEN:]
    expected_mac = _blake3.blake3(b'\x01' + nonce + ciphertext, key=key).digest(length=_MAC_LEN)
    if not _constant_time_compare(mac, expected_mac):
        raise ValueError('MAC verification failed.')
    keystream = _blake3.blake3(b'\x00' + nonce, key=key).digest(length=len(ciphertext))
    return bytes(c ^ k for c, k in zip(ciphertext, keystream))


def encrypt_sensitive_value(key: str, value: Any) -> Any:
    if not is_sensitive_setting_key(key):
        return value
    if value is None:
        return ''

    plain_value = str(value)
    if not plain_value:
        return ''
    if plain_value.startswith(_V2_PREFIX):
        return plain_value  # already encrypted with current scheme

    raw = _encrypt_bytes(_get_or_create_key(), plain_value.encode('utf-8'))
    token = base64.urlsafe_b64encode(raw).decode('ascii')
    return f'{_V2_PREFIX}{token}'


def decrypt_sensitive_value(key: str, value: Any) -> Any:
    if not is_sensitive_setting_key(key):
        return value
    if not isinstance(value, str) or not value:
        return value

    if value.startswith(_V1_PREFIX):
        logger.warning(
            f"Setting '{key}' was encrypted with the old Fernet scheme (enc:v1:), "
            'which requires the cryptography library. Please re-enter the value.'
        )
        return ''

    if not value.startswith(_V2_PREFIX):
        return value

    token = value[len(_V2_PREFIX):]
    try:
        raw = base64.urlsafe_b64decode(token.encode('ascii'))
        return _decrypt_bytes(_get_or_create_key(), raw).decode('utf-8')
    except (ValueError, RuntimeError) as e:
        logger.warning(f"Unable to decrypt setting '{key}': {e}. Using empty value.")
        return ''
