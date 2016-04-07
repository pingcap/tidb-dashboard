#!/bin/bash

# TODO: use docker compose
# advertise host
host="127.0.0.1"

# We should use a user defined network.
# See https://docs.docker.com/engine/userguide/networking/dockernetworks/
net="isolated_nw"

function init {
    if ! docker network inspect ${net} > /dev/null 2>&1; then
        echo "crate docker network ${net}"
        docker network create --driver bridge ${net} 
    fi

    docker run --net=${net} -d -p 12379:2379 -p 12380:2380 -p 14001:4001 -p 11234:1234 --name pd1 \
        --link pd1:pd1 --link pd2:pd2 --link pd3:pd3 \
        -e ETCD_NAME=etcd1 \
        -e ETCD_ADVERTISE_CLIENT_URLS=http://${host}:12379,http://${host}:14001 \
        -e ETCD_INITIAL_ADVERTISE_PEER_URLS=http://pd1:2380 \
        -e ETCD_INITIAL_CLUSTER_TOKEN=etcd-pd-cluster \
        -e ETCD_INITIAL_CLUSTER=etcd1=http://pd1:2380,etcd2=http://pd2:2380,etcd3=http://pd3:2380 \
        -e PD_ETCD_ENDPOINTS=pd1:2379,pd2:2379,pd3:2379 \
        -e PD_ADVERTISE_ADDR=${host}:11234 \
        pingcap/pd

    docker run --net=${net} -d -p 22379:2379 -p 22380:2380 -p 24001:4001 -p 21234:1234 --name pd2 \
        -e ETCD_NAME=etcd2 \
        --link pd1:pd1 --link pd2:pd2 --link pd3:pd3 \
        -e ETCD_ADVERTISE_CLIENT_URLS=http://${host}:22379,http://${host}:24001 \
        -e ETCD_INITIAL_ADVERTISE_PEER_URLS=http://pd2:2380 \
        -e ETCD_INITIAL_CLUSTER_TOKEN=etcd-pd-cluster \
        -e ETCD_INITIAL_CLUSTER=etcd1=http://pd1:2380,etcd2=http://pd2:2380,etcd3=http://pd3:2380 \
        -e PD_ETCD_ENDPOINTS=pd1:2379,pd2:2379,pd3:2379 \
        -e PD_ADVERTISE_ADDR=${host}:21234 \
        pingcap/pd

    docker run --net=${net} -d -p 32379:2379 -p 32380:2380 -p 34001:4001 -p 31234:1234 --name pd3 \
        --link pd1:pd1 --link pd2:pd2 --link pd3:pd3 \
        -e ETCD_NAME=etcd3 \
        -e ETCD_ADVERTISE_CLIENT_URLS=http://${host}:32379,http://${host}:34001 \
        -e ETCD_INITIAL_ADVERTISE_PEER_URLS=http://pd3:2380 \
        -e ETCD_INITIAL_CLUSTER_TOKEN=etcd-pd-cluster \
        -e ETCD_INITIAL_CLUSTER=etcd1=http://pd1:2380,etcd2=http://pd2:2380,etcd3=http://pd3:2380 \
        -e PD_ETCD_ENDPOINTS=pd1:2379,pd2:2379,pd3:2379 \
        -e PD_ADVERTISE_ADDR=${host}:31234 \
        pingcap/pd    
}

function start {
    docker start pd1 pd2 pd3
}

function stop {
    docker stop pd1 pd2 pd3
}

i=$1
case $1 in
    -h=*|--host=*)
        host="${i#*=}"
        ;; 
    -n=*|--net=*)
        net="${i#*=}"
        ;;
    *)
    ;;
esac

for i in "$@"
do
    case $i in
        "init")
            init
        ;;
        "start")
            start
        ;;
        "stop")
            stop
        ;;
        -h|--help)
            echo "[-h|--host=host] [-n|--net=network] [init|start|stop]"
            exit 0
            ;;
        *)     
        ;;
    esac
done