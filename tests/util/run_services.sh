#!/usr/bin/env bash

set -euo

INTEGRATION_LOG_PATH=/tmp/dashboard-integration-test.log
TIUP_BIN_DIR=$HOME/.tiup/bin
PLAYGROUND_TAG="integration_test"

PROJECT_DIR="$(dirname "$0")/.."
BIN="${PROJECT_DIR}/bin"

start_tidb() {
  echo "+ Waiting for TiDB start..."

  rm -rf $INTEGRATION_LOG_PATH
  TIDB_VERSION=${1:-latest}
  $TIUP_BIN_DIR/tiup playground --tag $PLAYGROUND_TAG $TIDB_VERSION > $INTEGRATION_LOG_PATH &
  ensure_tidb

  echo "  - TiDB Version: $TIDB_VERSION, start success!"
}

stop_tidb() {
  echo "+ Waiting for TiDB teardown..."
  $TIUP_BIN_DIR/tiup clean $PLAYGROUND_TAG >/dev/null 2>&1
  echo "  - Stopped!"
}

ensure_tidb() {
  i=1
  while ! grep "CLUSTER START SUCCESSFULLY" $INTEGRATION_LOG_PATH; do
    i=$((i+1))
    if [ "$i" -gt 20 ]; then
      echo 'Failed to start TiDB'
      return 1
    fi
    sleep 5
  done
}

FIXTRUE_DIR="${PROJECT_DIR}/tests/fixtures"

import_test_data() {
  if [ -e "$BIN/tidb-lightning" ]; then
    echo "+ Start import fixtures..."
    $BIN/tidb-lightning --backend tidb -tidb-host 127.0.0.1 -tidb-port 4000 -tidb-user root -d $FIXTRUE_DIR
    echo "+ Import success!"
  fi
}

dump_test_data() {
  if [ -e "$BIN/dumpling" ]; then
    echo "+ Start dump fixtures..."
    $BIN/dumpling -u root -P 4000 -h 127.0.0.1 --filetype sql -o $FIXTRUE_DIR -T $1
    echo "+ Dump success!"
  fi
}
