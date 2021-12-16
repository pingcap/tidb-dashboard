#!/usr/bin/env bash

# Download tools for running the integration test

set -euo pipefail

PROJECT_DIR="$(dirname "$0")/.."
BIN="${PROJECT_DIR}/bin"

download_tools() {
  echo "+ Download tools"

  if ! command -v tiup >/dev/null 2>&1; then
    echo "  - Downloading tiup..."
    curl --proto '=https' --tlsv1.2 -sSf https://tiup-mirrors.pingcap.com/install.sh | sh
  fi

  if [ ! -e "$BIN/toolkit.tar.gz" ]; then
    echo "  - Downloading toolkit..."
    curl -L -f -o "$BIN/toolkit.tar.gz" "https://download.pingcap.org/tidb-toolkit-nightly-linux-amd64.tar.gz"
  fi

  if [ ! -e "$BIN/tidb-lightning" ]; then
    tar -x -f "$BIN/toolkit.tar.gz" -C "$BIN/" tidb-toolkit-nightly-linux-amd64/bin/tidb-lightning
    mv "$BIN"/tidb-toolkit-nightly-linux-amd64/bin/tidb-lightning "$BIN/tidb-lightning"
  fi

  if [ ! -e "$BIN/dumpling" ]; then
    tar -x -f "$BIN/toolkit.tar.gz" -C "$BIN/" tidb-toolkit-nightly-linux-amd64/bin/dumpling
    mv "$BIN"/tidb-toolkit-nightly-linux-amd64/bin/dumpling "$BIN/dumpling"
  fi

  echo "+ All binaries are now available."
}
