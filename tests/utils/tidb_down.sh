#!/usr/bin/env bash

set -euo pipefail

DIR="$( cd "$( dirname "$0" )" >/dev/null 2>&1 && pwd )"

$DIR/download_tools.sh

echo "+ Waiting for TiDB teardown..."
tiup clean --all
