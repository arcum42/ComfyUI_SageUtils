"""Shared helpers for normalizing model_info shapes across utilities."""

from typing import Any, List


def unwrap_single_item(value: Any) -> Any:
    """Unwrap single-item tuple/list wrappers used by model-info call sites."""
    if isinstance(value, (tuple, list)):
        return value[0]
    return value


def as_list(value: Any) -> List[Any]:
    """Normalize a scalar/tuple/list value into a list."""
    if isinstance(value, list):
        return value
    if isinstance(value, tuple):
        return list(value)
    return [value]


def normalize_model_info_list(model_info: Any) -> List[Any]:
    """Normalize model_info into a flat list, preserving non-dict entries."""
    if isinstance(model_info, tuple):
        model_info = list(model_info)

    if isinstance(model_info, list):
        flattened_info: List[Any] = []
        for item in model_info:
            if isinstance(item, tuple):
                flattened_info.extend(item)
            else:
                flattened_info.append(item)
        return flattened_info

    return [model_info]


def iter_model_info_dicts(model_info: Any):
    """Iterate dictionary entries from model_info in normalized order."""
    for item in normalize_model_info_list(model_info):
        if isinstance(item, dict):
            yield item
