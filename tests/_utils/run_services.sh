#!/usr/bin/env bash

set -euo

INTEGRATION_LOG=/tmp/dashboard-integration-test.log

start_tidb() {
  echo "+ Waiting for TiDB start..."

  rm -rf $INTEGRATION_LOG
  tidb_version=${1:-latest}
  tiup playground $tidb_version > $INTEGRATION_LOG &
  ensure_tidb

  echo "  - TiDB Version: $tidb_version, start success!"
}

stop_tidb() {
  echo "+ Waiting for TiDB teardown..."
  # TODO: clean the latest started playground
  tiup clean --all >/dev/null 2>&1
  echo "  - Stopped!"
}

ensure_tidb() {
  i=1
  while ! grep "CLUSTER START SUCCESSFULLY" $INTEGRATION_LOG; do
    i=$((i+1))
    if [ "$i" -gt 20 ]; then
      echo 'Failed to start TiDB'
      return 1
    fi
    sleep 5
  done
}
