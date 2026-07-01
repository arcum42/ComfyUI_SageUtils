"""Tests for utils/llm/routes_helpers.py functions."""

import json
import tempfile
from pathlib import Path

import pytest

from comfyui_sageutils.utils.llm.routes_helpers import (
    build_generation_payload_options,
    build_llm_options,
    cleanup_temp_files,
    decode_base64_images_to_temp,
    format_sse_chunk,
    get_integration_profiles,
    get_compatible_models,
    normalize_provider,
    validate_generation_payload_options,
    validate_generation_data,
    validate_provider,
    validate_request_fields,
    validate_vision_data,
)


class TestValidation:
    """Test validation helper functions."""

    def test_validate_request_fields_success(self):
        """Valid request passes validation."""
        data = {"provider": "ollama", "model": "gemma", "prompt": "hello"}
        is_valid, error = validate_request_fields(data, ["provider", "model"])
        assert is_valid is True
        assert error is None

    def test_validate_request_fields_missing(self):
        """Missing fields are caught."""
        data = {"provider": "ollama"}
        is_valid, error = validate_request_fields(data, ["provider", "model", "prompt"])
        assert is_valid is False
        assert "Missing required fields" in error

    def test_validate_provider_valid(self):
        """Valid providers pass."""
        for provider in ["ollama", "lmstudio"]:
            is_valid, error = validate_provider(provider)
            assert is_valid is True
            assert error is None

    def test_validate_provider_invalid(self):
        """Invalid providers are rejected."""
        is_valid, error = validate_provider("invalid_provider")
        assert is_valid is False
        assert "Invalid provider" in error

    def test_normalize_provider_maps_legacy_aliases(self):
        """Legacy provider aliases normalize to canonical backend keys."""
        assert normalize_provider("lmstudio") == "lmstudio_rest"
        assert normalize_provider("ollama") == "ollama_rest"

    def test_normalize_provider_preserves_canonical_and_unknown_values(self):
        """Canonical backend keys and non-aliased values pass through."""
        assert normalize_provider("lmstudio_rest") == "lmstudio_rest"
        assert normalize_provider("openai") == "openai"
        assert normalize_provider("custom-provider") == "custom-provider"

    def test_validate_generation_data_valid(self):
        """Valid generation request passes."""
        data = {
            "provider": "ollama",
            "model": "gemma",
            "prompt": "hello",
            "system_prompt": "be helpful",
            "options": {"temperature": 0.7},
        }
        is_valid, error = validate_generation_data(data)
        assert is_valid is True
        assert error is None

    def test_validate_generation_data_missing_model(self):
        """Missing model is caught."""
        data = {"provider": "ollama", "prompt": "hello"}
        is_valid, error = validate_generation_data(data)
        assert is_valid is False

    def test_validate_generation_data_bad_provider(self):
        """Invalid provider is caught."""
        data = {
            "provider": "unknown",
            "model": "gemma",
            "prompt": "hello",
        }
        is_valid, error = validate_generation_data(data)
        assert is_valid is False

    def test_validate_vision_data_valid(self):
        """Valid vision request passes."""
        data = {
            "provider": "ollama",
            "model": "llava",
            "prompt": "describe this",
            "images": ["base64image1", "base64image2"],
        }
        is_valid, error = validate_vision_data(data)
        assert is_valid is True
        assert error is None

    def test_validate_vision_data_missing_images(self):
        """Missing images field is caught."""
        data = {
            "provider": "ollama",
            "model": "llava",
            "prompt": "describe this",
        }
        is_valid, error = validate_vision_data(data)
        assert is_valid is False
        assert "Missing required fields" in error

    def test_validate_vision_data_empty_images(self):
        """Empty images array is rejected."""
        data = {
            "provider": "ollama",
            "model": "llava",
            "prompt": "describe this",
            "images": [],
        }
        is_valid, error = validate_vision_data(data)
        assert is_valid is False
        assert "non-empty array" in error


class TestFormatting:
    """Test formatting helper functions."""

    def test_format_sse_chunk_basic(self):
        """SSE chunk formatting is correct."""
        chunk = {"chunk": "hello", "done": False}
        result = format_sse_chunk(chunk)
        assert result == f"data: {json.dumps(chunk)}\n\n"

    def test_format_sse_chunk_with_response(self):
        """SSE chunk with full_response field."""
        chunk = {"chunk": "", "done": True, "full_response": "complete text"}
        result = format_sse_chunk(chunk)
        assert "data: " in result
        assert '"done": true' in result
        assert "complete text" in result

    def test_format_sse_chunk_special_chars(self):
        """SSE chunk handles special characters."""
        chunk = {"chunk": "line\nwith\nnewlines", "done": False}
        result = format_sse_chunk(chunk)
        assert "data: " in result
        # JSON should escape newlines
        assert "\\n" in result or "\n" not in result.split("data: ", 1)[1].split("\n\n")[0]


class TestOptions:
    """Test option building helper."""

    def test_build_llm_options_defaults(self):
        """Default options are applied."""
        settings = {}
        options = build_llm_options("ollama", settings)
        assert options["temperature"] == 0.7
        assert options["seed"] == -1

    def test_build_llm_options_custom(self):
        """Custom settings override defaults."""
        settings = {"temperature": 0.9, "seed": 42}
        options = build_llm_options("ollama", settings)
        assert options["temperature"] == 0.9
        assert options["seed"] == 42

    def test_build_llm_options_ollama_specific(self):
        """Ollama-specific options are included."""
        settings = {
            "temperature": 0.7,
            "top_k": 40,
            "top_p": 0.9,
            "repeat_penalty": 1.1,
        }
        options = build_llm_options("ollama", settings)
        assert options["top_k"] == 40
        assert options["top_p"] == 0.9
        assert options["repeat_penalty"] == 1.1

    def test_build_llm_options_lmstudio_ignores_extra(self):
        """LM Studio ignores provider-specific options."""
        settings = {
            "temperature": 0.7,
            "top_k": 40,  # Should be ignored for lmstudio
        }
        options = build_llm_options("lmstudio", settings)
        assert "top_k" not in options
        assert options["temperature"] == 0.7

    def test_build_generation_payload_options_lmstudio_reasoning_and_context(self):
        """LM Studio payload normalization maps reasoning/context fields."""
        data = {
            "provider": "lmstudio",
            "reasoningEnabled": True,
            "contextLength": 8192,
            "options": {"temperature": 0.6},
        }

        options = build_generation_payload_options("lmstudio", data)
        assert options["temperature"] == 0.6
        assert options["reasoning"] == "on"
        assert options["context_length"] == 8192

    def test_build_generation_payload_options_lmstudio_boolean_reasoning(self):
        """LM Studio reasoning accepts legacy booleans and normalizes to on/off."""
        data = {
            "provider": "lmstudio",
            "options": {"reasoning": False, "temperature": 0.7},
        }

        options = build_generation_payload_options("lmstudio", data)
        assert options["reasoning"] == "off"
        assert options["temperature"] == 0.7

    def test_build_generation_payload_options_lmstudio_invalid_reasoning_removed(self):
        """Invalid LM Studio reasoning strings are sanitized out of options payload."""
        data = {
            "provider": "lmstudio",
            "options": {"reasoning": "maybe", "temperature": 0.7},
        }

        options = build_generation_payload_options("lmstudio", data)
        assert "reasoning" not in options
        assert options["temperature"] == 0.7

    def test_validate_generation_payload_options_lmstudio_invalid_reasoning(self):
        """LM Studio preflight validation rejects unsupported reasoning values."""
        data = {
            "provider": "lmstudio",
            "options": {"reasoning": "maybe"},
        }

        is_valid, error_msg = validate_generation_payload_options("lmstudio", data)
        assert is_valid is False
        assert "Expected one of: off, low, medium, high, on" in (error_msg or "")

    def test_build_generation_payload_options_ollama_think_and_tools(self):
        """Ollama payload normalization maps think, num_ctx, and tools fields."""
        data = {
            "provider": "ollama",
            "reasoningLevel": "medium",
            "contextLength": 4096,
            "toolsEnabled": True,
            "tools": [{"type": "function", "function": {"name": "x"}}],
            "options": {"top_p": 0.9},
        }

        options = build_generation_payload_options("ollama", data)
        assert options["top_p"] == 0.9
        assert options["think"] == "medium"
        assert options["num_ctx"] == 4096
        assert isinstance(options["tools"], list)

    def test_build_generation_payload_options_ollama_tool_profile_resolution(self):
        """Ollama resolves tools from selected tool profile when tools are enabled."""
        data = {
            "provider": "ollama",
            "toolProfile": "sage_core",
            "toolsEnabled": True,
            "options": {},
        }

        options = build_generation_payload_options("ollama", data)
        assert isinstance(options.get("tools"), list)
        assert len(options["tools"]) > 0
        first_tool = options["tools"][0]
        assert isinstance(first_tool, dict)
        assert "function" in first_tool

    def test_build_generation_payload_options_lmstudio_mcp_profile_resolution(self):
        """LM Studio resolves integrations from selected MCP profile when enabled."""
        data = {
            "provider": "lmstudio",
            "mcpProfile": "none",
            "mcpEnabled": True,
            "options": {},
        }

        options = build_generation_payload_options("lmstudio", data)
        # none profile should not inject integrations
        assert "integrations" not in options

    def test_get_integration_profiles_contains_defaults(self):
        """Integration profile metadata includes default profile keys."""
        profiles = get_integration_profiles()
        assert isinstance(profiles, dict)
        assert "tool_profiles" in profiles
        assert "mcp_profiles" in profiles
        assert "defaults" in profiles
        assert profiles["defaults"].get("tool_profile") == "none"
        assert profiles["defaults"].get("mcp_profile") == "none"


class TestImageHandling:
    """Test image handling helpers."""

    def test_get_compatible_models_filters_placeholders(self):
        """Placeholder messages starting with '(' are filtered."""
        models = ["model1", "(Ollama unavailable)", "model2", "(Error)"]
        result = get_compatible_models("ollama", models)
        assert result == ["model1", "model2"]
        assert "(Ollama unavailable)" not in result

    def test_get_compatible_models_empty_list(self):
        """Empty model list returns empty."""
        result = get_compatible_models("ollama", [])
        assert result == []

    def test_decode_base64_images_creates_files(self):
        """Base64 images are decoded to temp files."""
        import base64

        # Create a minimal valid PNG byte sequence
        png_bytes = bytes([137, 80, 78, 71, 13, 10, 26, 10])  # PNG magic bytes
        b64_image = base64.b64encode(png_bytes).decode("utf-8")

        temp_files = decode_base64_images_to_temp([b64_image])
        try:
            assert len(temp_files) == 1
            assert Path(temp_files[0]).exists()
            # Verify file contains the PNG magic bytes
            with open(temp_files[0], "rb") as f:
                content = f.read()
            assert content == png_bytes
        finally:
            cleanup_temp_files(temp_files)

    def test_decode_base64_images_multiple(self):
        """Multiple images are decoded separately."""
        import base64

        png_bytes = bytes([137, 80, 78, 71, 13, 10, 26, 10])
        b64_images = [
            base64.b64encode(png_bytes).decode("utf-8"),
            base64.b64encode(png_bytes).decode("utf-8"),
        ]

        temp_files = decode_base64_images_to_temp(b64_images)
        try:
            assert len(temp_files) == 2
            for temp_path in temp_files:
                assert Path(temp_path).exists()
        finally:
            cleanup_temp_files(temp_files)

    def test_cleanup_temp_files_removes_files(self):
        """Cleanup removes temporary files."""
        # Create temp files
        temp_files = []
        for i in range(2):
            fd, path = tempfile.mkstemp(suffix=".png")
            import os

            os.close(fd)
            temp_files.append(path)

        # Verify they exist
        for path in temp_files:
            assert Path(path).exists()

        # Clean up
        cleanup_temp_files(temp_files)

        # Verify they're gone
        for path in temp_files:
            assert not Path(path).exists()

    def test_cleanup_temp_files_nonexistent(self):
        """Cleanup handles nonexistent files gracefully."""
        # Should not raise
        cleanup_temp_files(["/nonexistent/path/file.png"])


class TestIntegration:
    """Integration tests for combined helper usage."""

    def test_validation_and_sse_flow(self):
        """Validation → formatting workflow."""
        # Simulate incoming request
        request_data = {
            "provider": "ollama",
            "model": "gemma",
            "prompt": "hello",
        }

        # Validate
        is_valid, error = validate_generation_data(request_data)
        assert is_valid

        # Format response chunk
        chunk = {"chunk": "response", "done": False}
        sse_chunk = format_sse_chunk(chunk)
        assert "data: " in sse_chunk

    def test_vision_workflow(self):
        """Vision request validation → image handling."""
        import base64

        png_bytes = bytes([137, 80, 78, 71, 13, 10, 26, 10])
        b64_image = base64.b64encode(png_bytes).decode("utf-8")

        request_data = {
            "provider": "ollama",
            "model": "llava",
            "prompt": "describe",
            "images": [b64_image],
        }

        # Validate
        is_valid, error = validate_vision_data(request_data)
        assert is_valid

        # Decode images
        temp_files = decode_base64_images_to_temp(request_data["images"])
        try:
            assert len(temp_files) == 1
            # Process image...
        finally:
            cleanup_temp_files(temp_files)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
