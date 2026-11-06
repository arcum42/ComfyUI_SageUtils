import json
import os
from pathlib import Path
import subprocess
import sys
import unittest


ROOT = Path(__file__).resolve().parents[1]


class VisualResolutionPickerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Isolate the real ComfyUI API from the optional-module stubs in conftest.
        script = """
import json
import sys
import types
from pathlib import Path

root = Path(sys.argv[1])
package = types.ModuleType("comfyui_sageutils")
package.__path__ = [str(root)]
sys.modules[package.__name__] = package
nodes = types.ModuleType("nodes")
nodes.MAX_RESOLUTION = 16384
sys.modules["nodes"] = nodes

from comfyui_sageutils.nodes.image_resolution_v3 import Sage_VisualResolutionPicker

schema = Sage_VisualResolutionPicker.define_schema()
cases = [(1024, 100, 100), (1024, 100, 50), (1024, 50, 100),
         (1024, 80, 40), (1001, 100, 50), (1024, 100, 1), (8, 1, 100),
         (9, 99, 100), (15, 99, 100), (1023, 99, 100)]
results = [Sage_VisualResolutionPicker.execute(*case).result for case in cases]
scaled_cases = [(1024, 100, 50, 2.0), (1024, 50, 100, 1.5),
                (15, 99, 100, 0.5), (8, 1, 100, 0.1),
                (16384, 100, 100, 10.0)]
scaled_results = [Sage_VisualResolutionPicker.execute(*case).result for case in scaled_cases]
invalid = []
for case in [(0, 100, 100), (16385, 100, 100), (1024, 0, 100), (1024, 100, 101),
             (1024, 100, 100, 0), (1024, 100, 100, 10.1),
             (1024, 100, 100, float("nan")), (1024, 100, 100, float("inf"))]:
    try:
        Sage_VisualResolutionPicker.execute(*case)
    except ValueError:
        invalid.append(True)
    else:
        invalid.append(False)
print(json.dumps({
    "node_id": schema.node_id,
    "outputs": [output.id for output in schema.outputs],
    "inputs": [[input.id, input.default, input.optional] for input in schema.inputs],
    "results": results,
    "scaled_results": scaled_results,
    "invalid": invalid,
}))
"""
        env = os.environ.copy()
        env["PYTHONPATH"] = str(ROOT.parent.parent)
        process = subprocess.run(
            [sys.executable, "-c", script, str(ROOT)],
            capture_output=True, text=True, env=env, check=True,
        )
        cls.data = json.loads(process.stdout)

    def test_schema(self):
        self.assertEqual(self.data["node_id"], "Sage_VisualResolutionPicker")
        self.assertEqual(self.data["outputs"], ["width", "height"])
        self.assertEqual(self.data["inputs"], [
            ["longest_side", 1024, False], ["grid_width", 100, False],
            ["grid_height", 100, False], ["multiplier", 1.0, True],
        ])

    def test_dimensions(self):
        self.assertEqual(self.data["results"], [
            [1024, 1024], [1024, 512], [512, 1024], [1024, 512],
            [1001, 504], [1024, 8], [8, 8], [8, 9], [8, 15], [1016, 1023],
        ])

    def test_invalid_inputs(self):
        self.assertEqual(self.data["invalid"], [True] * 8)

    def test_scaled_dimensions(self):
        self.assertEqual(self.data["scaled_results"], [
            [2048, 1024], [768, 1536], [4, 8], [1, 1], [163840, 163840],
        ])


if __name__ == "__main__":
    unittest.main()
