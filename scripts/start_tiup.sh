#!/usr/bin/env bash
set -ex
tidb_version=$1
mode=$2

if [ $mode = "restart" ]; then
    # get process id
    pid=$(ps -ef | grep -v start_tiup | grep tiup | grep -v grep | awk '{print $2}')

    for id in $pid
    do
        # kill tiup-playground
        echo "killing $id"
        kill -9 $id;
    done
else
    echo "install tiup"
    # Install TiUP
    curl --proto '=https' --tlsv1.2 -sSf https://tiup-mirrors.pingcap.com/install.sh | sh
    source /home/runner/.profile
    tiup update playground
    source /home/runner/.profile
fi

# Run Tiup
sleep 3
source /home/runner/.profile
tiup playground ${tidb_version} --tiflash=0 &> start_tiup.log &
