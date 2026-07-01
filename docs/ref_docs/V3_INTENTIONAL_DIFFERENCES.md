# Intentional v1→v3 Differences

This note lists behaviors that differ from the v1 nodes by design.

- **Lazy gating for control nodes**: Halt and Logical Switch now mark gated inputs as lazy and only evaluate the active branch. See [nodes/util_v3.py](nodes/util_v3.py#L60-L142).
- **Branch presence check**: Logical Switch validates that at least one branch is connected before execution. See [nodes/util_v3.py](nodes/util_v3.py#L113-L142).
- **File hash safety**: Get File Hash now validates the resolved path and fingerprints inputs using file metadata to avoid stale hashes. See [nodes/util_v3.py](nodes/util_v3.py#L522-L585).
- **Dataset loader safeguards**: Load Dataset From Folder validates that the directory exists and contains images, and fingerprints the dataset based on file metadata and caption files. See [nodes/training_v3.py](nodes/training_v3.py#L31-L104).
- **Training conditioning guard**: Training Captions To Conditioning now validates that a CLIP input is provided before execution. See [nodes/training_v3.py](nodes/training_v3.py#L136-L175).
