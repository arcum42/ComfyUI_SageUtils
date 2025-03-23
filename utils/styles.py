import os
import json
import pathlib

import folder_paths

base_path = pathlib.Path(os.path.dirname(os.path.realpath(__file__))).parent
#print(f"Loading SageUtils styles from {str(base_path)}")

users_path = pathlib.Path(folder_paths.get_user_directory())
sage_users_path = users_path / "default" / "SageUtils"
os.makedirs(str(sage_users_path), exist_ok=True)

sage_styles = {}
if not (sage_users_path / "sage_styles.json").is_file():
    print("No styles file found in user directory.")
    if (pathlib.Path(base_path) / "sage_styles.json").is_file():
        with open((pathlib.Path(base_path) / "sage_styles.json"), "r") as read_file:
            temp = json.load(read_file)

        with open((sage_users_path / "sage_styles.json"), "w") as write_file:
            json.dump(temp, write_file, separators=(",", ":"), sort_keys=True, indent=4)

        print(f"Copied old styles file to {str(sage_users_path)}.")

style_path = pathlib.Path(sage_users_path) / "sage_styles.json"
style_user_path = pathlib.Path(sage_users_path) / "sage_styles_user.json"

def load_styles():
    global sage_styles
    global style_path, style_user_path
    sage_styles = []

    for path in [style_path, style_user_path]:
        if path.is_file():
            try:
                with path.open(mode="r") as read_file:
                    sage_styles.append(json.load(read_file))
            except Exception as e:
                print(f"Unable to load styles from {path}: {e}")

