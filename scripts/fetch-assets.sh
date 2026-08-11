#!/usr/bin/env bash
#
# Download the Pokemon sprite pack.
#
# images.zip is about 218 MB of GIFs - 10,447 files across normal/shiny and
# front/back/icon. It is a release asset rather than a tracked directory, so
# clones stay small; this script puts it where the game expects it.
#
#   scripts/fetch-assets.sh
#
set -euo pipefail

REPO="${POKEH5_REPO:-thanhtinz/Pokeh5}"
TAG="${POKEH5_ASSET_TAG:-Ok}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
URL="https://github.com/${REPO}/releases/download/${TAG}/images.zip"

if [ -d "${ROOT}/images/pokemon" ] && [ "${1:-}" != "--force" ]; then
    echo "images/pokemon already exists; pass --force to download again."
    exit 0
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "Downloading ${URL}"
curl -fL --progress-bar -o "${TMP}/images.zip" "$URL"

echo "Extracting into ${ROOT}/images"
# -UU keeps the original bytes of the file names. A handful of item sprites in
# the 2019 archive carry doubly mis-encoded Vietnamese names that expand past
# the filesystem's 255-byte limit when unzip tries to normalise them.
unzip -q -o -UU "${TMP}/images.zip" -d "${ROOT}/images.tmp"

# The archive already contains pokemon/ and shiny/ at its root.
mkdir -p "${ROOT}/images"
cp -a "${ROOT}/images.tmp/images/." "${ROOT}/images/"
rm -rf "${ROOT}/images.tmp"

echo "Done: $(find "${ROOT}/images/pokemon" "${ROOT}/images/shiny" -name '*.gif' | wc -l) sprites"
