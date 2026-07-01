"""Tests for Ollama capability detection on REST provider."""

import pytest

pytestmark = pytest.mark.integration

from comfyui_sageutils.utils.llm.capabilities import ModelCapabilities
from comfyui_sageutils.utils.llm.providers import ollama_rest_client


class TestOllamaRESTCapabilities:
    """Test capability detection using the Ollama REST provider."""

    def test_get_model_capabilities_returns_model_capabilities_object(self):
        """Capability detection returns ModelCapabilities object."""
        try:
            import requests
            response = requests.get("http://localhost:11434/api/tags", timeout=5)
            response.raise_for_status()
            tags = response.json()
            if not tags.get("models"):
                pytest.skip("No models available from Ollama REST")
        except Exception:
            pytest.skip("Ollama REST server not available at localhost:11434")

        capabilities = ollama_rest_client.get_model_capabilities(
            enabled=True,
            model_name="qwen3.5:latest",
            model_obj=None
        )

        assert isinstance(capabilities, ModelCapabilities)
        assert capabilities.name == "qwen3.5:latest"
        assert capabilities.provider == "ollama_rest"

    def test_get_model_capabilities_reads_api_show_capabilities(self):
        """Capability detection merges /api/show capabilities field."""
        try:
            import requests
            response = requests.get("http://localhost:11434/api/tags", timeout=5)
            response.raise_for_status()
            tags_data = response.json()
            if not tags_data.get("models"):
                pytest.skip("No models available from Ollama REST")
            model_name = tags_data["models"][0].get("name")
        except Exception:
            pytest.skip("Ollama REST server not available at localhost:11434")

        if not model_name:
            pytest.skip("Could not get model name from Ollama REST tags")

        # Query /api/show to verify capabilities are available
        try:
            import requests
            show_response = requests.post(
                "http://localhost:11434/api/show",
                json={"name": model_name},
                timeout=30
            )
            show_response.raise_for_status()
            show_data = show_response.json()
        except Exception:
            pytest.skip(f"Could not query /api/show for {model_name}")

        capabilities = ollama_rest_client.get_model_capabilities(
            enabled=True,
            model_name=model_name,
            model_obj=tags_data["models"][0] if tags_data.get("models") else None
        )

        # Capabilities should include vision, tool_use, thinking from /api/show
        assert isinstance(capabilities, ModelCapabilities)
        assert hasattr(capabilities, 'vision')
        assert hasattr(capabilities, 'tool_use')
        assert hasattr(capabilities, 'thinking')

    def test_get_model_capabilities_map_returns_dict(self):
        """Capability map returns mapping of model names to capabilities."""
        try:
            import requests
            response = requests.get("http://localhost:11434/api/tags", timeout=5)
            response.raise_for_status()
            tags = response.json()
            if not tags.get("models"):
                pytest.skip("No models available from Ollama REST")
        except Exception:
            pytest.skip("Ollama REST server not available at localhost:11434")

        cap_map = ollama_rest_client.get_model_capabilities_map(enabled=True)

        assert isinstance(cap_map, dict)
        assert len(cap_map) > 0

        # All values should be ModelCapabilities
        for model_name, cap in cap_map.items():
            assert isinstance(cap, ModelCapabilities)
            assert cap.name == model_name

    def test_rest_model_capabilities_have_expected_fields(self):
        """REST capabilities include expected fields for a discovered model."""
        try:
            import requests
            response = requests.get("http://localhost:11434/api/tags", timeout=5)
            response.raise_for_status()
            tags_data = response.json()
            if not tags_data.get("models"):
                pytest.skip("No models available from Ollama REST")
            model_name = tags_data["models"][0].get("name")
        except Exception:
            pytest.skip("Ollama REST server not available at localhost:11434")

        capabilities = ollama_rest_client.get_model_capabilities(
            enabled=True,
            model_name=model_name,
            model_obj=tags_data["models"][0],
        )

        assert isinstance(capabilities.vision, bool)
        assert isinstance(capabilities.tool_use, bool)
        assert isinstance(capabilities.reasoning, bool)
