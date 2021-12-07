#!/usr/bin/env bash

# Download tools for running the integration test

set -euo pipefail

download_tools() {
  echo "+ Download tools"
  echo "  - Check tiup command"
  if ! command -v tiup >/dev/null 2>&1; then
    echo "  - Download tiup"
    curl --proto '=https' --tlsv1.2 -sSf https://tiup-mirrors.pingcap.com/install.sh | sh
  fi
}
