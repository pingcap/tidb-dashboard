#!/usr/bin/env bash

set -euo pipefail

INTEGRATION_LOG_PATH=/tmp/dashboard-integration-test.log
INTEGRATION_PID_LOG_PATH=/tmp/dashboard-integration-test-pid.log
TIUP_BIN_DIR=$HOME/.tiup/bin

PROJECT_DIR="$(dirname "$0")/.."
BIN="${PROJECT_DIR}/bin"

start_tidb() {
  echo "+ Waiting for TiDB start, for at most 15 min..."

  rm -rf $INTEGRATION_LOG_PATH
  TIDB_VERSION=${1:-latest}
  $TIUP_BIN_DIR/tiup playground $TIDB_VERSION > $INTEGRATION_LOG_PATH &
  echo $! > $INTEGRATION_PID_LOG_PATH
  ensure_tidb

  echo "  - Start TiDB@$TIDB_VERSION Success!"
}

stop_tidb() {
  echo "+ Waiting for TiDB teardown..."
  kill `cat $INTEGRATION_PID_LOG_PATH`
}

ensure_tidb() {
  i=1
  while ! grep "TiDB Playground Cluster is started" $INTEGRATION_LOG_PATH; do
    i=$((i+1))
    if [ "$i" -gt 90 ]; then
      echo 'Failed to start TiDB'
      return 1
    fi
    sleep 10
  done
}

dump_schema() {
  if [ ${1:-""} = "" ]; then
    echo "Please specify the 'database-name.table-name' to dump"
    echo "Usage: tests/dump.sh database-name.table-name"
    return 1
  fi

  if [ -e "$BIN/dumpling" ]; then
    echo "+ Start dump schema..."
    $BIN/dumpling -u root -P 4000 -h 127.0.0.1 --filetype sql --no-data -o "${PROJECT_DIR}/tests/schema" -T $1
    echo "  - Dump success!"
  else
    echo "Tool $BIN/dumpling not exist"
    return 1
  fi
}
