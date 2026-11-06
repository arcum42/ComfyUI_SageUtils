"""Resolution selection nodes."""

import math

from comfy_api.latest import io

from ..utils.constants import MAX_RESOLUTION, SAGE_UTILS_CAT


class Sage_VisualResolutionPicker(io.ComfyNode):
    """Choose an aspect ratio visually and output dimensions for a longest side."""

    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="Sage_VisualResolutionPicker",
            display_name="Visual Resolution Picker",
            description="Choose a rectangle on a grid and set its longest side in pixels.",
            category=f"{SAGE_UTILS_CAT}/image/res",
            inputs=[
                io.Int.Input("longest_side", default=1024, min=8, max=MAX_RESOLUTION, step=8,
                             tooltip="Size of the longest side in pixels."),
                io.Int.Input("grid_width", display_name="Grid width", default=100, min=1, max=100, step=1,
                             socketless=True, tooltip="Relative width of the rectangle on the grid."),
                io.Int.Input("grid_height", display_name="Grid height", default=100, min=1, max=100, step=1,
                             socketless=True, tooltip="Relative height of the rectangle on the grid."),
                io.Float.Input("multiplier", default=1.0, min=0.1, max=10.0, step=0.1, round=0.001,
                               optional=True, tooltip="Scale both selected dimensions."),
            ],
            outputs=[
                io.Int.Output("width", tooltip="Selected width in pixels."),
                io.Int.Output("height", tooltip="Selected height in pixels."),
            ],
        )

    @classmethod
    def execute(cls, longest_side: int, grid_width: int, grid_height: int, multiplier: float = 1.0):
        if longest_side < 8 or longest_side > MAX_RESOLUTION:
            raise ValueError(f"longest_side must be between 8 and {MAX_RESOLUTION}")
        if not (1 <= grid_width <= 100 and 1 <= grid_height <= 100):
            raise ValueError("Grid dimensions must be between 1 and 100")
        if not math.isfinite(multiplier) or not 0.1 <= multiplier <= 10.0:
            raise ValueError("multiplier must be between 0.1 and 10")

        shorter_grid_side = min(grid_width, grid_height)
        longer_grid_side = max(grid_width, grid_height)
        shorter_side = min(longest_side // 8 * 8, max(8, int(
            longest_side * shorter_grid_side / longer_grid_side / 8 + 0.5
        ) * 8))
        width = longest_side if grid_width >= grid_height else shorter_side
        height = longest_side if grid_height >= grid_width else shorter_side
        return io.NodeOutput(math.floor(width * multiplier + 0.5),
                             math.floor(height * multiplier + 0.5))
