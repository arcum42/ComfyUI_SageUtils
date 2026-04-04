"""Tensor conversion helpers for LLM utilities."""

from ..helpers_image import tensor_to_base64


def tensor_to_base64_safe(images):
    """Convert tensor images to base64 payload expected by provider APIs."""
    return tensor_to_base64(images)
