#!/usr/bin/env bash

set -euo pipefail

DIR="$( cd "$( dirname "$0" )" >/dev/null 2>&1 && pwd )"

$DIR/../utils/tidb_up.sh
$DIR/run_test.sh || { $DIR/../utils/tidb_down.sh; exit 1; }
$DIR/../utils/tidb_down.sh
