import folder_paths
from .model_cache import cache
from .helpers import pull_metadata, clean_keywords

def get_lora_keywords(lora_name):
    lora_path = folder_paths.get_full_path_or_raise("loras", lora_name)
    if cache.by_path(lora_path).get("trainedWords", None) is None:
        pull_metadata(lora_path, True)

    return cache.by_path(lora_path).get("trainedWords", [])

def get_lora_stack_keywords(lora_stack = None):
    lora_keywords = []
    
    if lora_stack is None:
        return []
    
    for lora in lora_stack:
        print(f"Let's get keywords for {lora[0]}")
        try:
            keywords = get_lora_keywords(lora[0])
            if keywords != []:
                lora_keywords.extend(keywords)
            print(keywords)
        except:
            print("Exception getting keywords!")
            continue

    return clean_keywords(lora_keywords)

def add_lora_to_stack(lora_name, model_weight, clip_weight, lora_stack = None):
    if lora_stack is None:
        lora = (lora_name, model_weight, clip_weight)
        stack = [lora]
        return(stack)
        
    stack = []
    for the_name, m_weight, c_weight in lora_stack:
        stack.append((the_name, m_weight, c_weight))
    stack.append((lora_name, model_weight, clip_weight))
    return stack