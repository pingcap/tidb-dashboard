#!/usr/bin/env bash

set -euo pipefail

source tests/util/download_tools.sh >/dev/null
source tests/util/run_services.sh >/dev/null

download_tools

trap stop_tidb EXIT
start_tidb
import_test_data

echo "+ Run integration tests"
GO111MODULE=on go test -v -cover -coverpkg ./pkg/apiserver/slowquery/... ./tests/...
echo "  - All tests passed!"
