#!/bin/bash

killall -9 etcd
killall -9 pd-server

etcd --listen-peer-urls="http://:2380,http://:7001" \
    --listen-client-urls="http://:2379,http://:4001" \
    --advertise-client-urls="http://:2379,http://:4001" &
sleep 3
pd-server --addr=":1234"