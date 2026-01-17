import folder_paths
from git import Optional
from .model_cache import cache
from .helpers import pull_metadata, clean_keywords

def norm_lora_stack(lora_stack: Optional[list]) -> Optional[list]:
    """
    Normalize the lora_stack input to always be a list of lists/tuples.
    
    Args:
        lora_stack (list, optional): The input lora_stack which can be None, a single lora tuple/list,
                                     or a list of lora tuples/lists.
                                     
    Returns:
        list or None: The normalized lora_stack as a list of tuples/lists, or None if input was None.
    """
    if lora_stack is None:
        return None
    if isinstance(lora_stack, tuple) or isinstance(lora_stack, list):
        if not isinstance(lora_stack[0], (list, tuple)):
            lora_stack = [lora_stack]
    else:
        lora_stack = None
    return lora_stack
    
def get_lora_keywords(lora_name):
    lora_path = folder_paths.get_full_path_or_raise("loras", lora_name)
    if cache.by_path(lora_path).get("trainedWords") is None:
        pull_metadata(lora_path, timestamp=True)
    return cache.by_path(lora_path).get("trainedWords", [])

def get_lora_stack_keywords(lora_stack=None):
    if not lora_stack:
        return []
    
    if isinstance(lora_stack, tuple) or isinstance(lora_stack, list):
        if not isinstance(lora_stack[0], (list, tuple)):
            lora_stack = [lora_stack]

    # Collect unique lora names
    lora_names = {lora[0] for lora in lora_stack}
    lora_paths = [folder_paths.get_full_path_or_raise("loras", name) for name in lora_names]
    pull_metadata(lora_paths)
    # Gather all keywords into a set for uniqueness
    all_keywords = set()
    for name in lora_names:
        try:
            keywords = cache.by_path(folder_paths.get_full_path_or_raise("loras", name)).get("trainedWords", [])
            if keywords:
                all_keywords.update(map(str.strip, keywords))
        except Exception as e:
            print(f"Exception getting keywords for {name}: {e}")
            continue
    return clean_keywords(all_keywords)

def add_lora_to_stack(lora_name, model_weight, clip_weight, lora_stack=None):
    lora = (lora_name, model_weight, clip_weight)
    if lora_stack is None:
        return [lora]
    return [*lora_stack, lora]
