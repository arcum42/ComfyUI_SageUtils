#!/usr/bin/env bash
set -euo pipefail

# Sync selected documentation from Comfy-Org/docs into a local mirror.
# By default this pulls only sections most relevant for node development.

UPSTREAM_REPO_URL="${UPSTREAM_REPO_URL:-https://github.com/Comfy-Org/docs.git}"
UPSTREAM_REF="${UPSTREAM_REF:-main}"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
TARGET_ROOT="${TARGET_ROOT:-${SCRIPT_DIR}/upstream_docs}"

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

echo "Cloning ${UPSTREAM_REPO_URL} (${UPSTREAM_REF}) with sparse checkout..."
git clone \
  --depth 1 \
  --branch "${UPSTREAM_REF}" \
  --filter=blob:none \
  --sparse \
  "${UPSTREAM_REPO_URL}" \
  "${TMP_DIR}/docs" >/dev/null

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