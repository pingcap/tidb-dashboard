#!/usr/bin/env bash

# Available flags:
# COVER_PKG
#   Pass to coverpkg flag, apply coverage analysis in each test to packages matching the patterns.
#   default: ./pkg/...
# TIDB_VERSION
#   Run tests with the specified tidb version
#   default: latest

# See code coverage html
# $ go tool cover -html ./coverage/integration.out

set -euo pipefail

source tests/util/download_tools.sh >/dev/null
source tests/util/run_services.sh >/dev/null

download_tools

trap stop_tidb EXIT
start_tidb ${TIDB_VERSION:=latest}

import_test_data

echo "+ Run integration tests"
GO111MODULE=on TIDB_VERSION=$TIDB_VERSION go test -race -v -cover -coverprofile=coverage/integration_${TIDB_VERSION}.out -coverpkg=${COVER_PKG:-./pkg/...} ./tests/...
echo "  - All tests passed!"
