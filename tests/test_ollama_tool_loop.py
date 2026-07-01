"""Unit tests for Ollama local tool loop helpers."""

from comfyui_sageutils.utils.llm.providers import ollama_rest_client


def test_parse_tool_arguments_from_json_string():
    parsed = ollama_rest_client._parse_tool_arguments('{"text": "hello"}')
    assert parsed == {"text": "hello"}


def test_extract_tool_name_and_args_from_function_payload():
    tool_call = {
        "id": "call_1",
        "function": {
            "name": "sage.echo",
            "arguments": '{"text": "hello"}',
        },
    }
    name, args, call_id = ollama_rest_client._extract_tool_name_and_args(tool_call)
    assert name == "sage.echo"
    assert args == {"text": "hello"}
    assert call_id == "call_1"


def test_execute_local_tool_echo():
    result = ollama_rest_client._execute_local_tool("sage.echo", {"text": "hi"})
    assert result == {"text": "hi"}


def test_extract_allowed_tool_names_from_schema():
    names = ollama_rest_client._extract_allowed_tool_names(
        {
            "tools": [
                {"type": "function", "function": {"name": "sage.echo"}},
                {"name": "sage.get_time"},
            ]
        }
    )
    assert names == {"sage.echo", "sage.get_time"}


def test_execute_local_tool_rejects_undeclared_tool():
    try:
        ollama_rest_client._execute_local_tool(
            "sage.echo",
            {"text": "hi"},
            allowed_tool_names={"sage.get_time"},
        )
    except Exception as exc:
        assert "Tool is not declared in request schema" in str(exc)
        return
    raise AssertionError("Expected undeclared tool to be rejected")


def test_local_tool_prompts_search(monkeypatch):
    monkeypatch.setattr(
        ollama_rest_client,
        "_load_saved_prompts",
        lambda: {
            "prompts": [
                {"id": "p1", "name": "Landscape", "description": "Mountains", "positive": "wide vista", "negative": "", "category": "general"},
                {"id": "p2", "name": "Portrait", "description": "Studio", "positive": "person", "negative": "", "category": "character"},
            ]
        },
    )

    result = ollama_rest_client._local_tool_prompts_search({"query": "vista", "limit": 5})
    assert result["count"] == 1
    assert result["matches"][0]["id"] == "p1"


def test_generate_with_tool_loop_executes_tool_and_returns_final_text(monkeypatch):
    calls = {"count": 0}

    def fake_chat_once(payload, operation):
        calls["count"] += 1
        if calls["count"] == 1:
            return {
                "message": {
                    "content": "",
                    "tool_calls": [
                        {
                            "id": "call_1",
                            "function": {
                                "name": "sage.echo",
                                "arguments": '{"text": "loop-value"}',
                            },
                        }
                    ],
                }
            }
        return {
            "message": {
                "content": "final answer",
            }
        }

    monkeypatch.setattr(ollama_rest_client, "_chat_once", fake_chat_once)

    final_text, tool_events = ollama_rest_client._generate_with_tool_loop(
        model="dummy",
        messages=[{"role": "user", "content": "test"}],
        options={
            "tools": [
                {
                    "type": "function",
                    "function": {
                        "name": "sage.echo",
                        "description": "Echo back text",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"}
                            },
                            "required": ["text"],
                        },
                    },
                }
            ]
        },
        operation="test",
    )

    assert final_text == "final answer"
    assert any(e.get("event") == "tool_call.start" for e in tool_events)
    assert any(e.get("event") == "tool_call.success" for e in tool_events)
    assert calls["count"] == 2
