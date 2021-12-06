#!/usr/bin/env bash

set -euo pipefail

echo "+ Download tools"
tests/_utils/download_tools.sh

source tests/_utils/run_services.sh >/dev/null

trap stop_tidb EXIT
start_tidb

echo "+ Start integration tests"
GO111MODULE=on go test -v ./tests/...
