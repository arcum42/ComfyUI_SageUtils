# Node Expansion - Creating Dynamic Subgraphs

Source: <https://docs.comfy.org/custom-nodes/backend/expansion>

## Node Expansion

Normally, when a node is executed, that execution function immediately returns the output results of that node. "Node Expansion" is a relatively advanced technique that allows nodes to return a new subgraph of nodes that should take its place in the graph. This technique is what allows custom nodes to implement loops.

### A Simple Example

First, here's a simple example of what node expansion looks like:

> **Tip**: We highly recommend using the `GraphBuilder` class when creating subgraphs. It isn't mandatory, but it prevents you from making many easy mistakes.

```python
def load_and_merge_checkpoints(self, checkpoint_path1, checkpoint_path2, ratio):
    from comfy_execution.graph_utils import GraphBuilder # Usually at the top of the file
    graph = GraphBuilder()
    checkpoint_node1 = graph.node("CheckpointLoaderSimple", checkpoint_path=checkpoint_path1)
    checkpoint_node2 = graph.node("CheckpointLoaderSimple", checkpoint_path=checkpoint_path2)
    merge_model_node = graph.node("ModelMergeSimple", model1=checkpoint_node1.out(0), model2=checkpoint_node2.out(0), ratio=ratio)
    merge_clip_node = graph.node("ClipMergeSimple", clip1=checkpoint_node1.out(1), clip2=checkpoint_node2.out(1), ratio=ratio)
    return {
        # Returning (MODEL, CLIP, VAE) outputs
        "result": (merge_model_node.out(0), merge_clip_node.out(0), checkpoint_node1.out(2)),
        "expand": graph.finalize(),
    }
```

While this same node could previously be implemented by manually calling into ComfyUI internals, using expansion means that each subnode will be cached separately (so if you change `model2`, you don't have to reload `model1`).

### Requirements

In order to perform node expansion, a node must return a dictionary with the following keys:

1. `result`: A tuple of the outputs of the node. This may be a mix of finalized values (like you would return from a normal node) and node outputs.
2. `expand`: The finalized graph to perform expansion on. See below if you are not using the `GraphBuilder`.

#### Additional Requirements if not using GraphBuilder

The format expected from the `expand` key is the same as the ComfyUI API format. The following requirements are handled by the `GraphBuilder`, but must be handled manually if you choose to forego it:

1. Node IDs must be unique across the entire graph. (This includes between multiple executions of the same node due to the use of lists.)
2. Node IDs must be deterministic and consistent between multiple executions of the graph (including partial executions due to caching).

Even if you don't want to use the `GraphBuilder` for actually building the graph (e.g. because you're loading the raw json of the graph from a file), you can use the `GraphBuilder.alloc_prefix()` function to generate a prefix and `comfy.graph_utils.add_graph_prefix` to fix existing graphs to meet these requirements.

### Efficient Subgraph Caching

While you can pass non-literal inputs to nodes within the subgraph (like torch tensors), this can inhibit caching within the subgraph. When possible, you should pass links to subgraph objects rather than the node itself. (You can declare an input as a `rawLink` within the input's Additional Parameters to do this easily.)
