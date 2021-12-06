#!/usr/bin/env bash

set -euo

TEST_START_LOG=/tmp/dashboard-test-log.log

start_tidb() {
  echo "+ Waiting for TiDB start..."

  rm -rf $TEST_START_LOG
  TIDB_VERSION=${1:-latest}
  tiup playground $TIDB_VERSION --tiflash 0 --without-monitor > $TEST_START_LOG &
  ensure_tidb

  echo "  - TiDB Version: $TIDB_VERSION, start success!"
}

stop_tidb() {
  echo "+ Waiting for TiDB teardown..."
  # TODO: clean the latest started playground
  tiup clean --all >/dev/null 2>&1
  echo "  - Stopped!"
}

ensure_tidb() {
  i=1
  while ! grep "CLUSTER START SUCCESSFULLY" $TEST_START_LOG; do
    i=$((i+1))
    if [ "$i" -gt 20 ]; then
      echo 'Failed to start TiDB'
      return 1
    fi
    sleep 5
  done
}
