#!/usr/bin/env bash

# Available flags:
# COVER_PKG
#   Pass to coverpkg flag, apply coverage analysis in each test to packages matching the patterns.
#   Default: ./pkg/...

# See code coverage html
# $ go tool cover -html ./coverage/integration.out

set -euo pipefail

source tests/util/download_tools.sh >/dev/null
source tests/util/run_services.sh >/dev/null

download_tools

trap stop_tidb EXIT
start_tidb

import_test_data

echo "+ Run integration tests"
GO111MODULE=on go test -race -v -cover -coverprofile=coverage/integration.out -coverpkg=${COVER_PKG:-./pkg/...} ./tests/...
echo "  - All tests passed!"
