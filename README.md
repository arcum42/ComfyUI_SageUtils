This is the Sage Utils set of custom nodes. Everyone seems to be making their own suites of nodes, and I decided I'd go ahead and make one myself, for any nodes I feel would be useful.

There's an example workflow in the example folder. I actually didn't use nodes from any other custom nodes in this one, which actually was part of why I added some of the nodes I did...

![Example Workflow Image](examples/example_workflow.png)

I'll talk about metadata nodes first, since they were the main thing I started out with.

There *are* other metadata nodes out there, but I mostly either wasn't having luck with them or was not satisfied with them, so I decided to write my own.

Since the metadata has to be saved when you save the image, and can't actually be added to an image output, I created my own Save Image node, "Save Image w/ Added Metadata". This is a normal Save Image, with a few changes. There are two extra inputs, "param_metadata" input and "extra_metadata". These accept text, and write the text in the metadata under either "parameters" or "extra". The first is where A1111 writes its metadata, and the latter is just if you want to add extra information. Both are optional.

There are also two switches added, "include_node_metadata", and "include_extra_pnginfo_metadata". These just let you turn on and off the metadata ComfyUI *normally* writes.

Now, you could just write out the metadata by hand, but you probably want that automated, so I've got two nodes for constructing the metadata, "Construct Metadata" and "Construct Metadata Lite", which are roughly the same aside from what actually gets written in the metadata. The output is just a string, so you can view it if you want to see the difference.

Either are going to need inputs from several places, and I had to make custom versions of several nodes to get it.

for the "model_info" parameter, you can either get it from a "Checkpoint Info" node, or hook it to one of my custom nodes for loading a checkpoint. There's "Load Checkpoint w/ Metadata", "Load Recently Used Checkpoint", and "Load Diffusion Model w/ Metadata". 

The first is a normal node for loading a checkpoint, just with an added "model_info" output. It *is* going to hash the model the first time you load it and save it to a cache, and it also checks civitai for information on the model, as I'm writing in the Civitai Resources section in the metadata, with model and version id. It also saves the last time you loaded it. Model information is saved in "sage_cache.json", which you might find useful. Indeed, a friend of mine wrote a [useful script](https://github.com/tecknight/comfy_model_html) to generate a model/lora report from it.

The second is roughly the same, but the pulldown only has models you've actually used in the last week. Very useful if, like me, you have a million models saved.

The third is for UNET models. I likely should add clip and vae, but have not done so yet.

Now, as far as loras go, what I did was accept an optional "lora_stack" input, and multiple other custom node sets already have nodes that work with this. I did, however, add some nodes for lora stacks myself, so you don't need to rely on other custom nodes.

I've got a "Simple Lora Stack" node, which lets you set a lora and weights, and toggle on and off the lora. You just chain these together for all your loras. There's also a "Recent Lora Stack" variant.

The lora_stack then needs to go to a "Lora Stack Loader" node. Pipe your model, clip, and the lora_stack through this node, and it'll load all the loras in the stack. Make sure to also hook the lora_stack to the construct node if you want them showing up in the metadata.

You could also use the "Model + Lora Stack Loader" node instead, which accepts a model_info input as well, and loads both the checkpoint and the lora.

Alternative nodes for this are in [ComfyUI-Lora-Auto-Trigger-Words](https://github.com/idrirap/ComfyUI-Lora-Auto-Trigger-Words) and [Comfyroll Studio](https://github.com/Suzie1/ComfyUI_Comfyroll_CustomNodes) and others.

In order for it to print your KSampler information, it'll need to get that as well, and that's what the "Sampler Info" node is for. I've *also* added a "KSampler w/ Sampler Info" node, so you can hook the info node to both the KSampler and the Construct node. Or there's the "KSampler + Decoder" nodes, if you want to decode the VAE at the same time.

Another area where this can be quite useful is hooking the same "Sampler Info" node to *multiple* KSamplers.

The Construct node also wants the width and height. There are multiple ways to get this, of course, but for convenience, I added a "Empty Latent Passthrough" node. It works just like an Empty Latent Image node, except it passes through the width and height so your lines are less of a mess. Its also got a switch that lets you turn it into the SD3 variant of the empty latent image node.

That mostly covers the metadata nodes, but let's talk about the other things I've added.

There's a "Load Image w/ Size & Metadata" node, which gives you the size of the image, and any metadata in it, if you wanted to find out the prompt in an image in a hurry or such.

There's a "Lora Stack -> Keywords" node. Hook a lora_stack to it, and it returns a string with all the keywords from civitai for the loras in the stack.

There's a "Lora Info" node. This gives you some information from Civitai on the *last* lora in the stack. You'll get what the base_model of the lora is, the model and version names combined, the url for that version *and* one for the latest version that's published and not in early access, and a sample image. "Model Info" is much the same, but for models.

There's a "Prompts to CLIP" node. This accepts a clip and a positive and negative prompt, both of which are optional. It returns conditioning for both, as well as the text given to it. Using this saves space, since you don't need two clip text encode nodes this way, and it has the added benefit that it will zero the conditioning automatically for anything that doesn't have text passed to it.

I've also created a "Zero Conditioning" node, if you don't want to use that. And a "Randomized Conditioning" node, but that's mostly just something I'm messing with. I may remove it in the future.

Some nodes I added that you've seen a million times include "Set Bool/Integer/Float/Text" nodes, "View Text", "Join Text", and "Join Text x3". The x3 one just has three inputs, and I'll note that the "Set Text" node has prefix and suffix inputs added that concat whatever's hooked to them with the main text box, so you can avoid using the join text node a fair amount of the time. All basic stuff that really should be in core, but isn't for some reason. I'll depreciate them if they do get added to core at some point.

There's a "Add Pony v6 Prefixes" node. Using Pony v6 a lot, this just lets you add the score tags automatically, as well as a source and rating tag. 

Then there's the "Switch" node. It's simple enough. Hook a bool to it, and two inputs, and it'll return one of them on true and the other on false. I'll probably add some logic and math nodes to go with that later.

You probably don't need this, but there's a "Get Sha256 Hash" node, if you want to find out something's hash.

And there's the "Cache Maintenance" and "Model Scan & Report" nodes.

Okay, so the "Cache Maintenance" node does the following. It will check all the files listed in the cache to see if they exist. Any that don't will be returned as "ghost_entries", and if you set "remove_ghost_entries" to true, it deletes the entries. It *also* returns "dup_hash", which lists any models with the same hash in the list (which are *probably* duplicate copies of the same model), and "dup_model", which means they have the same model id, so likely different versions of the same model. Both can be helpful for model organization.

Now, what "Model Scan & Report" does is this. First, you need to set if it's going to scan loras, checkpoints, both, or neither. This is going to go through and hash *all* your loras/checkpoints and query civitai for them. It'll take forever, but then, all that information is in the cache, so no waiting on it calculating it, and if you were going to do something with sage_cache.json, it's fully populated. It returns both a model list and a lora list, sorted by base model type, which, again, can be pretty useful, though it is limited to things in the cache (so if you had scan off, it might not be showing everything).

I *am* updating this frequently at the moment, so if there are any nodes not listed in the readme, I might just not have documented them yet, or they might be something experimental I'm playing with. Feel free to file issues if you have ideas or run into bugs, or, better yet, pr's, though there's no guarantee I'll accept them.

You can, of course, copy code from this for your own use, though it'd be nice if you credit me, and let me know.

I'm also currently unemployed, so feel free to toss some money my way to my [Kofi](https://ko-fi.com/arcum42) account, through other ways, or, indeed, job offers (especially if you *do* use my code).
