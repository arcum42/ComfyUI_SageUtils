#!/usr/bin/env python3
import argparse
import datetime
import os
import shutil
import subprocess
import sys
from pathlib import Path
from tempfile import TemporaryDirectory

DEFAULT_UPSTREAM_REPO_URL = "https://github.com/Comfy-Org/docs.git"
DEFAULT_UPSTREAM_REF = "main"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Sync selected docs from Comfy-Org/docs into a local mirror."
    )
    parser.add_argument(
        "--upstream-repo-url",
        default=os.environ.get("UPSTREAM_REPO_URL", DEFAULT_UPSTREAM_REPO_URL),
        help="Upstream repository URL (env: UPSTREAM_REPO_URL)",
    )
    parser.add_argument(
        "--upstream-ref",
        default=os.environ.get("UPSTREAM_REF", DEFAULT_UPSTREAM_REF),
        help="Upstream branch or ref (env: UPSTREAM_REF)",
    )
    parser.add_argument(
        "--target-root",
        default=os.environ.get("TARGET_ROOT"),
        help="Local target root directory (env: TARGET_ROOT)",
    )
    return parser.parse_args()


def run_git(args, cwd: Path, silent: bool = False) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["git"] + args,
        cwd=str(cwd),
        check=True,
        stdout=subprocess.DEVNULL if silent else None,
        stderr=subprocess.STDOUT if silent else None,
    )


def copy_tree(src_root: Path, target_root: Path) -> None:
    for src_file in src_root.rglob("*"):
        if not src_file.is_file():
            continue

        dest_rel_path = src_file.relative_to(src_root)
        dest_file = target_root / dest_rel_path
        if src_file.suffix.lower() == ".mdx":
            dest_file = dest_file.with_suffix(".md")

        dest_file.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src_file, dest_file)


def write_sync_info(target_root: Path, upstream_repo_url: str, upstream_ref: str, upstream_commit: str) -> None:
    sync_info_path = target_root / "SYNC_INFO.txt"
    synced_at = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    sync_info_path.write_text(
        f"Source repository: {upstream_repo_url}\n"
        f"Source ref: {upstream_ref}\n"
        f"Source commit: {upstream_commit}\n"
        f"Synced at (UTC): {synced_at}\n"
        "Included paths:\n"
        "- custom-nodes\n"
        "- development\n"
        "- interface\n"
        "- installation\n"
        "Notes:\n"
        "- .mdx files are copied and renamed to .md.\n"
        "- Content is preserved as-is (including MDX syntax/components).\n"
    )


def main() -> int:
    args = parse_args()
    script_dir = Path(__file__).resolve().parent
    target_root = Path(args.target_root).expanduser() if args.target_root else script_dir / "upstream_docs"

    print(f"Cloning {args.upstream_repo_url} ({args.upstream_ref}) with sparse checkout...")

    with TemporaryDirectory(prefix="sync_upstream_docs_") as tmp_dir:
        tmp_path = Path(tmp_dir)
        checkout_dir = tmp_path / "docs"

        run_git(
            [
                "clone",
                "--depth",
                "1",
                "--branch",
                args.upstream_ref,
                "--filter=blob:none",
                "--sparse",
                args.upstream_repo_url,
                str(checkout_dir),
            ],
            cwd=tmp_path,
            silent=True,
        )

        run_git(["sparse-checkout", "set", "custom-nodes", "development", "interface", "installation"], cwd=checkout_dir)
        upstream_commit = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=str(checkout_dir),
            check=True,
            capture_output=True,
            text=True,
        ).stdout.strip()

        if target_root.exists():
            shutil.rmtree(target_root)
        target_root.mkdir(parents=True, exist_ok=True)

        copy_tree(checkout_dir / "custom-nodes", target_root)
        copy_tree(checkout_dir / "development", target_root)
        copy_tree(checkout_dir / "interface", target_root)
        copy_tree(checkout_dir / "installation", target_root)

        write_sync_info(target_root, args.upstream_repo_url, args.upstream_ref, upstream_commit)

    print(f"Sync complete. Files are available at: {target_root}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except subprocess.CalledProcessError as exc:
        print(f"Git command failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
