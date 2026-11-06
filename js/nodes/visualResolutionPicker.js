const GRID_SIZE = 200;
const GRID_MARGIN = 15;

const clampGridValue = value => Math.max(1, Math.min(100, Math.round(value)));

export function setupVisualResolutionPicker(nodeType) {
  const onNodeCreated = nodeType.prototype.onNodeCreated;
  nodeType.prototype.onNodeCreated = function (...args) {
    const result = onNodeCreated?.apply(this, args);
    const longestWidget = this.widgets.find(widget => widget.name === 'longest_side');
    const widthWidget = this.widgets.find(widget => widget.name === 'grid_width');
    const heightWidget = this.widgets.find(widget => widget.name === 'grid_height');
    const multiplierWidget = this.widgets.find(widget => widget.name === 'multiplier');
    if (!longestWidget || !widthWidget || !heightWidget || !multiplierWidget) {
      throw new Error('Visual Resolution Picker input widgets are missing');
    }

    const grid = {
      type: 'custom',
      name: 'resolution_grid',
      serialize: false,
      options: { serialize: false },
      computeSize: () => [GRID_SIZE + GRID_MARGIN * 2, GRID_SIZE + GRID_MARGIN * 2 + 12],
      draw(ctx, node, width, y) {
        const x = GRID_MARGIN;
        const top = y + GRID_MARGIN;
        this.gridTop = top;
        ctx.save();
        ctx.fillStyle = '#222922';
        ctx.fillRect(x, top, GRID_SIZE, GRID_SIZE);
        ctx.fillStyle = '#677267';
        for (let gx = 0; gx <= 20; gx++) {
          for (let gy = 0; gy <= 20; gy++) {
            ctx.fillRect(x + gx * GRID_SIZE / 20, top + gy * GRID_SIZE / 20, 1, 1);
          }
        }
        const rectWidth = GRID_SIZE * widthWidget.value / 100;
        const rectHeight = GRID_SIZE * heightWidget.value / 100;
        const handleX = x + rectWidth;
        const handleY = top + GRID_SIZE - rectHeight;
        ctx.fillStyle = 'rgba(190, 210, 190, 0.18)';
        ctx.fillRect(x, handleY, rectWidth, rectHeight);
        ctx.strokeStyle = '#b7c8b7';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, handleY, rectWidth, rectHeight);
        ctx.beginPath();
        ctx.arc(handleX, handleY, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#c9d6c9';
        ctx.fill();
        ctx.stroke();
        const linkedInput = node.inputs?.some(input =>
          ['longest_side', 'multiplier'].includes(input.name) && input.link != null);
        const longest = longestWidget.value;
        const shorter = Math.min(Math.floor(longest / 8) * 8, Math.max(8, Math.floor(
          longest * Math.min(widthWidget.value, heightWidget.value) /
          Math.max(widthWidget.value, heightWidget.value) / 8 + 0.5
        ) * 8));
        const outputWidth = Math.floor((widthWidget.value >= heightWidget.value ? longest : shorter)
          * multiplierWidget.value + 0.5);
        const outputHeight = Math.floor((heightWidget.value >= widthWidget.value ? longest : shorter)
          * multiplierWidget.value + 0.5);
        ctx.fillStyle = '#c9d6c9';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(linkedInput ? 'Dimensions depend on input' :
          `${outputWidth} x ${outputHeight}`, x, top + GRID_SIZE + 17);
        ctx.restore();
      },
      mouse(event, pos, node) {
        if (event.type === 'pointerdown') {
          if (pos[0] < GRID_MARGIN || pos[0] > GRID_MARGIN + GRID_SIZE ||
              pos[1] < this.gridTop || pos[1] > this.gridTop + GRID_SIZE) return false;
          node.graph?.beforeChange();
          this.dragging = true;
        } else if (event.type !== 'pointermove' && event.type !== 'pointerup') {
          return false;
        }
        if (!this.dragging) return false;
        widthWidget.value = clampGridValue((pos[0] - GRID_MARGIN) / GRID_SIZE * 100);
        heightWidget.value = clampGridValue((this.gridTop + GRID_SIZE - pos[1]) / GRID_SIZE * 100);
        node.setDirtyCanvas(true, true);
        if (event.type === 'pointerup') {
          this.dragging = false;
          node.graph?.afterChange();
        }
        return true;
      },
    };
    this.addCustomWidget(grid);
    const swapButton = this.addWidget('button', 'Swap width and height', null, () => {
      this.graph?.beforeChange();
      [widthWidget.value, heightWidget.value] = [heightWidget.value, widthWidget.value];
      this.setDirtyCanvas(true, true);
      this.graph?.afterChange();
    });
    swapButton.serialize = false;
    swapButton.options ??= {};
    swapButton.options.serialize = false;
    const size = this.computeSize();
    this.setSize([Math.max(this.size[0], size[0], GRID_SIZE + GRID_MARGIN * 2),
      Math.max(this.size[1], size[1])]);
    return result;
  };
}
