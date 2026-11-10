#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mkdir -p "$ROOT/archives/reassembled"
cat "$ROOT"/archives/original-parts/terumbu-homepage-original.zip.part* > "$ROOT/archives/reassembled/Terumbu - Homepage .zip"
cat "$ROOT"/archives/original-parts/terumbu-expeditions-original.zip.part* > "$ROOT/archives/reassembled/Terumbu - Expeditions.zip"
# Verify bytes. Portable on macOS or Linux with shasum; on Linux sha256sum also works.
if command -v shasum >/dev/null 2>&1; then
  echo "b0ccb0c920506a3ee2d63ee4c93011fccb43272d37bd3ad0ec0f5eb905eba57c  $ROOT/archives/reassembled/Terumbu - Homepage .zip" | shasum -a 256 -c -
  echo "c86c9b24d2cfc4373319dd56ec287969ceb5ea69e817ead11911aa1869639bd2  $ROOT/archives/reassembled/Terumbu - Expeditions.zip" | shasum -a 256 -c -
else
  echo "b0ccb0c920506a3ee2d63ee4c93011fccb43272d37bd3ad0ec0f5eb905eba57c  $ROOT/archives/reassembled/Terumbu - Homepage .zip" | sha256sum -c -
  echo "c86c9b24d2cfc4373319dd56ec287969ceb5ea69e817ead11911aa1869639bd2  $ROOT/archives/reassembled/Terumbu - Expeditions.zip" | sha256sum -c -
fi
printf 'Original ZIPs reconstructed in %s\n' "$ROOT/archives/reassembled"
