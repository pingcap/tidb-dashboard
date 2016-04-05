#!/bin/bash

pkill -9 -f etcd
pkill -9 -f pd-server

etcd --listen-peer-urls="http://0.0.0.0:2380,http://0.0.0.0:7001" \
    --listen-client-urls="http://0.0.0.0:2379,http://0.0.0.0:4001" \
    --initial-cluster-state="new" &

ret=1
# Wait for Etcd to start.
for i in {1..5} 
do
    # Wait 1s and check.
    sleep 1

    if ETCDCTL_API=3 etcdctl --endpoints 127.0.0.1:2379 endpoint-health; then
        ret=0
        break
    fi
done

if [ $ret -ne 0 ]; then
    echo "etcd may not start successfully, exit."
    exit 1
fi

pd_args=(--addr=":1234")
if [ ! -z $PD_ETCD_ENDPOINTS ]; then 
    pd_args+=(--etcd="$PD_ETCD_ENDPOINTS")
fi

if [ ! -z $PD_ADVERTISE_ADDR ]; then 
    pd_args+=(--advertise-addr="$PD_ADVERTISE_ADDR")
fi

pd-server ${pd_args[@]}