#!/usr/bin/env bash
set -euo pipefail

python3 "$(dirname -- "$0")/sync_upstream_docs.py" "$@"

pushd "${TMP_DIR}/docs" >/dev/null
git sparse-checkout set custom-nodes development
UPSTREAM_COMMIT="$(git rev-parse HEAD)"
popd >/dev/null

rm -rf "${TARGET_ROOT}"
mkdir -p "${TARGET_ROOT}"

copy_tree() {
  local src_root="$1"
  local rel_path
  local src_file
  local dest_file

  while IFS= read -r -d '' src_file; do
    rel_path="${src_file#${src_root}/}"
    dest_file="${TARGET_ROOT}/${rel_path}"

    if [[ "${dest_file}" == *.mdx ]]; then
      dest_file="${dest_file%.mdx}.md"
    fi

    mkdir -p "$(dirname -- "${dest_file}")"
    cp "${src_file}" "${dest_file}"
  done < <(find "${src_root}" -type f -print0)
}

copy_tree "${TMP_DIR}/docs/custom-nodes"
copy_tree "${TMP_DIR}/docs/development"

cat > "${TARGET_ROOT}/SYNC_INFO.txt" <<EOF
Source repository: ${UPSTREAM_REPO_URL}
Source ref: ${UPSTREAM_REF}
Source commit: ${UPSTREAM_COMMIT}
Synced at (UTC): $(date -u +"%Y-%m-%dT%H:%M:%SZ")
Included paths:
- custom-nodes
- development
Notes:
- .mdx files are copied and renamed to .md.
- Content is preserved as-is (including MDX syntax/components).
EOF

echo "Sync complete. Files are available at: ${TARGET_ROOT}"