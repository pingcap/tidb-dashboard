#!/usr/bin/env bash

set -euo pipefail

INTEGRATION_LOG_PATH=/tmp/dashboard-integration-test.log
INTEGRATION_PID_LOG_PATH=/tmp/dashboard-integration-test-pid.log
TIUP_BIN_DIR=$HOME/.tiup/bin
TIDB_START_TIMEOUT_SECONDS=${TIDB_START_TIMEOUT_SECONDS:-900}

PROJECT_DIR="$(dirname "$0")/.."
BIN="${PROJECT_DIR}/bin"

start_tidb() {
  echo "+ Waiting for TiDB start, for at most $TIDB_START_TIMEOUT_SECONDS seconds..."

  rm -f "$INTEGRATION_LOG_PATH"
  TIDB_VERSION=${1:-latest}
  "$TIUP_BIN_DIR/tiup" playground "$TIDB_VERSION" --without-monitor --tiflash=0 > "$INTEGRATION_LOG_PATH" 2>&1 &
  echo $! > "$INTEGRATION_PID_LOG_PATH"
  ensure_tidb

  echo "  - Start TiDB@$TIDB_VERSION Success!"
}

stop_tidb() {
  echo "+ Waiting for TiDB teardown..."
  if [ ! -f "$INTEGRATION_PID_LOG_PATH" ]; then
    return
  fi

  pid=$(cat "$INTEGRATION_PID_LOG_PATH")
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid"
  fi
}

ensure_tidb() {
  deadline=$((SECONDS + TIDB_START_TIMEOUT_SECONDS))
  while ! grep -q "TiDB Playground Cluster is started" "$INTEGRATION_LOG_PATH"; do
    pid=$(cat "$INTEGRATION_PID_LOG_PATH")
    if ! kill -0 "$pid" 2>/dev/null; then
      echo 'TiUP playground exited before TiDB started'
      cat "$INTEGRATION_LOG_PATH"
      return 1
    fi
    if [ "$SECONDS" -ge "$deadline" ]; then
      echo 'Failed to start TiDB'
      cat "$INTEGRATION_LOG_PATH"
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
