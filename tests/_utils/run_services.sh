#!/usr/bin/env bash

set -euo

integration_log_path=/tmp/dashboard-integration-test.log
tiup_bin_dir=$HOME/.tiup/bin
playground_tag="integration_test"

start_tidb() {
  echo "+ Waiting for TiDB start..."

  rm -rf $integration_log_path
  tidb_version=${1:-latest}
  $tiup_bin_dir/tiup playground --tag $playground_tag $tidb_version > $integration_log_path &
  ensure_tidb

  echo "  - TiDB Version: $tidb_version, start success!"
}

stop_tidb() {
  echo "+ Waiting for TiDB teardown..."
  $tiup_bin_dir/tiup clean $playground_tag >/dev/null 2>&1
  echo "  - Stopped!"
}

ensure_tidb() {
  i=1
  while ! grep "CLUSTER START SUCCESSFULLY" $integration_log_path; do
    i=$((i+1))
    if [ "$i" -gt 20 ]; then
      echo 'Failed to start TiDB'
      return 1
    fi
    sleep 5
  done
}
