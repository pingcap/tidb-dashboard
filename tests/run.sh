#!/usr/bin/env bash

# Available flags:
# COVER_PKG
#   Pass to coverpkg flag, apply coverage analysis in each test to packages matching the patterns.
#   default: ./pkg/...
# TIDB_VERSION
#   Run tests with the specified tidb version
#   default: latest

# See code coverage html
# go tool cover -html ./coverage/integration_$TIDB_VERSION.txt

set -euo pipefail

PROJECT_DIR="$(dirname "$0")/.."

source scripts/_inc/download_tools.sh >/dev/null
source scripts/_inc/run_services.sh >/dev/null

download_tools

trap stop_tidb EXIT
start_tidb ${TIDB_VERSION:=latest}

$PROJECT_DIR/tests/create_table.sh

PRECISE_TIDB_VERSION=$(mysql --host 127.0.0.1 --port 4000 -u root -se "SELECT VERSION()" | sed -r "s/.*TiDB-(v[0-9]+\.[0-9]+\.[0-9]+).*/\1/g")

echo "+ Run integration tests on tidb $PRECISE_TIDB_VERSION"
TIDB_VERSION=$PRECISE_TIDB_VERSION go test -race -v -cover \
-coverprofile=coverage/integration_${TIDB_VERSION}.txt \
-coverpkg=${COVER_PKG:-./pkg/...} \
./tests/integration/...

echo "  - All tests passed!"
