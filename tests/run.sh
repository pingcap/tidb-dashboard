#!/usr/bin/env bash

set -euo pipefail

echo "+ Download tools"
tests/download_tools.sh

source tests/_utils/run_services

trap stop_tidb EXIT
start_tidb

echo "+ Start integration tests"
SELECTED_TEST_NAME="${TEST_NAME-$(find tests -mindepth 2 -maxdepth 2 -name run.sh | cut -d/ -f2 | sort)}"
echo -e "  - Selected test cases: \n$SELECTED_TEST_NAME"

for casename in $SELECTED_TEST_NAME; do
    script=tests/$casename/run.sh
    echo "+ Running test $script..."
    bash "$script" && echo "  - TEST: [$casename] success!"
done
