"""Shared type conversion helpers for utility modules."""

from typing import Any


def str_to_bool(value: Any) -> bool:
    """Convert common string/bool values to a bool."""
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        lowered = value.lower()
        if lowered in {"true", "1", "yes"}:
            return True
        if lowered in {"false", "0", "no"}:
            return False
    raise ValueError(f"Cannot convert {value} to boolean.")


def bool_to_str(value: Any) -> str:
    """Convert common string/bool values to normalized true/false strings."""
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, str):
        lowered = value.lower()
        if lowered in {"true", "1", "yes"}:
            return "true"
        if lowered in {"false", "0", "no"}:
            return "false"
    raise ValueError(f"Cannot convert {value} to string representation of boolean.")