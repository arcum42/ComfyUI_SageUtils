import assert from 'node:assert/strict';
import test from 'node:test';
import { setupVisualResolutionPicker } from '../js/nodes/visualResolutionPicker.js';

function createNode() {
  class Node {
    constructor() {
      this.widgets = [
        { name: 'longest_side', value: 1024 },
        { name: 'grid_width', value: 100 },
        { name: 'grid_height', value: 100 },
        { name: 'multiplier', value: 1 },
      ];
      this.size = [100, 100];
      this.changes = [];
      this.graph = {
        beforeChange: () => this.changes.push('before'),
        afterChange: () => this.changes.push('after'),
      };
    }
    onNodeCreated() { return 'created'; }
    addCustomWidget(widget) { this.widgets.push(widget); }
    addWidget(type, name, value, callback) {
      const widget = { type, name, value, callback, options: {} };
      this.widgets.push(widget);
      return widget;
    }
    computeSize() { return [220, 320]; }
    setSize(size) { this.size = size; }
    setDirtyCanvas() { this.dirty = true; }
  }
  setupVisualResolutionPicker(Node);
  const node = new Node();
  assert.equal(node.onNodeCreated(), 'created');
  const grid = node.widgets.find(widget => widget.name === 'resolution_grid');
  const ctx = new Proxy({ fillText: text => { node.preview = text; } },
    { get: (target, key) => target[key] ?? (() => {}) });
  grid.draw(ctx, node, 230, 80);
  return { node, grid, ctx };
}

test('drag updates the saved grid inputs and groups undo', () => {
  const { node, grid, ctx } = createNode();
  assert.equal(grid.serialize, false);
  assert.equal(grid.options.serialize, false);
  assert.deepEqual(node.size, [230, 320]);
  assert.equal(grid.mouse({ type: 'pointerdown' }, [115, 145], node), true);
  assert.deepEqual(node.widgets.slice(1, 3).map(widget => widget.value), [50, 75]);
  assert.equal(grid.mouse({ type: 'pointermove' }, [500, 500], node), true);
  assert.deepEqual(node.widgets.slice(1, 3).map(widget => widget.value), [100, 1]);
  assert.equal(grid.mouse({ type: 'pointerup' }, [65, 195], node), true);
  assert.deepEqual(node.widgets.slice(1, 3).map(widget => widget.value), [25, 50]);
  assert.deepEqual(node.changes, ['before', 'after']);
  assert.equal(node.dirty, true);
  grid.draw(ctx, node, 230, 80);
  assert.equal(node.preview, '512 x 1024');
  node.widgets[0].value = 15;
  node.widgets[1].value = 99;
  node.widgets[2].value = 100;
  grid.draw(ctx, node, 230, 80);
  assert.equal(node.preview, '8 x 15');
  node.widgets[3].value = 0.5;
  grid.draw(ctx, node, 230, 80);
  assert.equal(node.preview, '4 x 8');
  node.inputs = [{ name: 'longest_side', link: 7 }];
  grid.draw(ctx, node, 230, 80);
  assert.equal(node.preview, 'Dimensions depend on input');
  node.inputs = [{ name: 'multiplier', link: 8 }];
  grid.draw(ctx, node, 230, 80);
  assert.equal(node.preview, 'Dimensions depend on input');
});

test('swap button exchanges the ratio, updates the preview, and groups undo', () => {
  const { node, grid, ctx } = createNode();
  const button = node.widgets.find(widget => widget.name === 'Swap width and height');
  assert.equal(button.serialize, false);
  assert.equal(button.options.serialize, false);
  node.widgets[1].value = 100;
  node.widgets[2].value = 50;
  node.widgets[3].value = 2;
  grid.draw(ctx, node, 230, 80);
  assert.equal(node.preview, '2048 x 1024');
  button.callback();
  assert.deepEqual(node.widgets.slice(1, 3).map(widget => widget.value), [50, 100]);
  assert.deepEqual(node.changes, ['before', 'after']);
  assert.equal(node.dirty, true);
  grid.draw(ctx, node, 230, 80);
  assert.equal(node.preview, '1024 x 2048');
  button.callback();
  assert.deepEqual(node.widgets.slice(1, 3).map(widget => widget.value), [100, 50]);
});

test('outside clicks do not change the ratio', () => {
  const { node, grid } = createNode();
  assert.equal(grid.mouse({ type: 'pointerdown' }, [0, 0], node), false);
  assert.equal(grid.mouse({ type: 'pointermove' }, [115, 145], node), false);
  assert.deepEqual(node.widgets.slice(1, 3).map(widget => widget.value), [100, 100]);
  assert.deepEqual(node.changes, []);
});
