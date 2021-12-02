#!/usr/bin/env bash

set -euo pipefail

DIR="$( cd "$( dirname "$0" )" >/dev/null 2>&1 && pwd )"
PROJECT_DIR=$( cd "$DIR/../.."; pwd )

$DIR/download_tools.sh

echo "+ Waiting for TiDB start..."
tiup playground latest --tiflash 0 --without-monitor &
$PROJECT_DIR/scripts/wait_tiup_playground_2.sh 10 20
