#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="$(dirname "$0")/.."

source scripts/_inc/download_tools.sh >/dev/null
source scripts/_inc/run_services.sh >/dev/null

download_tools
dump_schema $@
go run $PROJECT_DIR/tests/util/dump/dump.go $@
