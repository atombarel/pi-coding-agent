#!/usr/bin/env zsh
set -euo pipefail

repo="${PI_SETUP_REPO:-atombarel/personal-pi-setup}"
ref="${PI_SETUP_REF:-main}"

tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/personal-pi-setup.XXXXXX")"
cleanup() {
  rm -rf "$tmp_dir"
}
trap cleanup EXIT

archive="$tmp_dir/source.tar.gz"
url="https://codeload.github.com/${repo}/tar.gz/${ref}"

echo "Fetching ${repo}@${ref}..."
curl -fsSL "$url" -o "$archive"
tar -xzf "$archive" -C "$tmp_dir"

source_dirs=("$tmp_dir"/*(/N))
if (( ${#source_dirs[@]} != 1 )); then
  echo "Expected one source directory in downloaded archive." >&2
  exit 1
fi

source_dir="$source_dirs[1]"
if [[ ! -f "$source_dir/scripts/install-or-update.mjs" ]]; then
  echo "Could not find installer in downloaded archive." >&2
  exit 1
fi

node "$source_dir/scripts/install-or-update.mjs" --source "$source_dir" "$@"
