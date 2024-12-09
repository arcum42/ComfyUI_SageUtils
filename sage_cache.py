import json
import pathlib
import folder_paths

cache_data = {}
cache_path = pathlib.Path(folder_paths.base_path) / "custom_nodes" / "ComfyUI_SageUtils" / "sage_cache.json"

def load_cache():
    global cache_data
    global cache_path

    try:
        if cache_path.is_file():
            with cache_path.open(mode = "r") as read_file:
                cache_data = json.load(read_file)
    except:
        print("Unable to load cache.")

def save_cache():
    global cache_data
    global cache_path

    try:
        if cache_data is not None:
            if not cache_data:
                print("Skipping saving cache, as the cache is empty.")
            else:
                with cache_path.open(mode = "w") as output_file:
                    output_file.write(json.dumps(cache_data, separators=(",", ":"), sort_keys=True, indent=4))
        else:
            print("Skipping saving cache, as there is no cache.")
    except:
        print("Unable to save cache.")
