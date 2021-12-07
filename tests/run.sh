#!/usr/bin/env bash

set -euo pipefail

source tests/_utils/download_tools.sh >/dev/null
source tests/_utils/run_services.sh >/dev/null

download_tools

trap stop_tidb EXIT
start_tidb

echo "+ Run integration tests"
GO111MODULE=on go test -v ./tests/...
echo "  - All tests passed!"
