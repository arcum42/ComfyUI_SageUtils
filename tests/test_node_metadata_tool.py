from types import SimpleNamespace

from comfyui_sageutils.tools import node_metadata_tool as tool


class MockNode:
    def __init__(self, name, schema):
        self.__name__ = name
        self._schema = schema

    def define_schema(self):
        return self._schema


def make_schema(node_id, display_name, description, category, inputs, outputs):
    return SimpleNamespace(
        node_id=node_id,
        display_name=display_name,
        description=description,
        category=category,
        inputs=inputs,
        outputs=outputs,
    )


def make_input(id_, display_name, tooltip, optional=False):
    return SimpleNamespace(id=id_, display_name=display_name, tooltip=tooltip, optional=optional, get_io_type=lambda: "String")


def make_output(id_, display_name, tooltip, is_output_list=False):
    return SimpleNamespace(id=id_, display_name=display_name, tooltip=tooltip, is_output_list=is_output_list, get_io_type=lambda: "Image")


def test_list_nodes_returns_non_empty_list(monkeypatch):
    node = MockNode("Sage_TestNode", make_schema("Sage_TestNode", "Test Node", "A test node.", "Test", [], []))
    monkeypatch.setattr(tool, "_import_node_list", lambda: [node])

    nodes = tool.list_nodes()

    assert isinstance(nodes, list)
    assert nodes == [{"node_id": "Sage_TestNode", "display_name": "Test Node"}]


def test_get_node_metadata_returns_metadata_for_all_nodes(monkeypatch):
    schema = make_schema(
        "Sage_TestNode",
        "Test Node",
        "A test node.",
        "Test",
        [make_input("input1", "Input 1", "First input.")],
        [make_output("output1", "Output 1", "First output.")],
    )
    node = MockNode("Sage_TestNode", schema)
    monkeypatch.setattr(tool, "_import_node_list", lambda: [node])
    monkeypatch.setattr(tool, "_import_io_module", lambda: SimpleNamespace())

    metadata = tool.get_node_metadata()

    assert isinstance(metadata, list)
    assert len(metadata) == 1
    node_meta = metadata[0]
    assert node_meta["node_id"] == "Sage_TestNode"
    assert node_meta["display_name"] == "Test Node"
    assert node_meta["description"] == "A test node."
    assert node_meta["category"] == "Test"
    assert node_meta["inputs"][0]["name"] == "input1"
    assert node_meta["outputs"][0]["name"] == "output1"


def test_get_node_metadata_filters_by_node_id(monkeypatch):
    schema = make_schema(
        "Sage_TestNode",
        "Test Node",
        "A test node.",
        "Test",
        [],
        [],
    )
    node = MockNode("Sage_TestNode", schema)
    monkeypatch.setattr(tool, "_import_node_list", lambda: [node])
    monkeypatch.setattr(tool, "_import_io_module", lambda: SimpleNamespace())

    filtered = tool.get_node_metadata(["Sage_TestNode"])

    assert len(filtered) == 1
    assert filtered[0]["node_id"] == "Sage_TestNode"


def test_list_nodes_uses_schema_ids(monkeypatch):
    schema = make_schema(
        "Sage_PromptText",
        "Prompt Text",
        "A prompt node.",
        "Test",
        [],
        [],
    )
    node = MockNode("Sage_PromptText", schema)
    monkeypatch.setattr(tool, "_import_node_list", lambda: [node])
    monkeypatch.setattr(tool, "_import_io_module", lambda: SimpleNamespace())

    nodes = tool.list_nodes()

    assert nodes == [{"node_id": "Sage_PromptText", "display_name": "Prompt Text"}]


def test_render_node_doc(monkeypatch, tmp_path):
    schema = make_schema(
        "Sage_TestNode",
        "Test Node",
        "A test node.",
        "Test",
        [make_input("input1", "Input 1", "First input.")],
        [make_output("output1", "Output 1", "First output.")],
    )
    node = MockNode("Sage_TestNode", schema)
    monkeypatch.setattr(tool, "_import_node_list", lambda: [node])
    monkeypatch.setattr(tool, "_import_io_module", lambda: SimpleNamespace())

    content = tool.render_node_doc("Sage_TestNode")

    assert "# Test Node" in content
    assert "* **Node ID:** `Sage_TestNode`" in content
    assert "### `input1` — `String`" in content
    assert "(optional)" not in content
    assert "### `output1` — `Image`" in content
    assert "List output" not in content


def test_node_notes_in_schema(monkeypatch):
    schema = make_schema(
        "Sage_TestNode",
        "Test Node",
        "A test node.",
        "Test",
        [make_input("input1", "Input 1", "First input.")],
        [make_output("output1", "Output 1", "First output.")],
    )
    schema.notes = "These are custom node notes."
    node = MockNode("Sage_TestNode", schema)
    monkeypatch.setattr(tool, "_import_node_list", lambda: [node])

    content = tool.render_node_doc("Sage_TestNode")
    assert "These are custom node notes." in content
