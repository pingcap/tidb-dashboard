#!/usr/bin/env bash
set -ex
tidb_version=$1
without_ngm=${2:-false}
mode=${3:-"start"}

# TIUP_BIN_DIR=$TIUP_HOME/bin/tiup
TIUP_BIN_DIR=$HOME/.tiup/bin/tiup
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

if [ $mode = "restart" ]; then
    # get process id
    pid=$(ps -ef | grep -v start_tiup | grep tiup | grep -v grep | awk '{print $2}')

    for id in $pid
    do
        # kill tiup-playground
        echo "killing $id"
        kill -9 $id;
    done

    # Run Tiup
    $TIUP_BIN_DIR playground ${tidb_version} --db.config=$DIR/tiup.config.toml --tiflash=0 &> start_tiup.log &
else
    echo "install tiup"
    # Install TiUP
    curl --proto '=https' --tlsv1.2 -sSf https://tiup-mirrors.pingcap.com/install.sh | sh
    $TIUP_BIN_DIR update playground

    # Run Tiup
    $TIUP_BIN_DIR playground ${tidb_version} --without-monitor=${without_ngm} --tiflash=0 &> ~/start_tiup.log &
fi
