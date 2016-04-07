# pd [![Build Status](https://travis-ci.org/pingcap/pd.svg?branch=master)](https://travis-ci.org/pingcap/pd)

Pd is the abbreviate for placement driver.

## Docker

### Build

```
docker build -t pingcap/pd .
```

### Usage

### Single Node

```
docker run -d -p 2379:2379 -p 2380:2380 -p 4001:4001 -p 1234:1234 --name pd pingcap/pd 
```

### Cluster

node0

```
docker run -d -p 2379:2379 -p 2380:2380 -p 4001:4001 -p 1234:1234 --name pd \
    -e ETCD_NAME=etcd0
    -e ETCD_ADVERTISE_CLIENT_URLS=http://192.168.12.50:2379,http://192.168.12.50:4001 \
    -e ETCD_INITIAL_ADVERTISE_PEER_URLS=http://192.168.12.50:2380 \
    -e ETCD_INITIAL_CLUSTER_TOKEN=etcd-pd-cluster \
    -e ETCD_INITIAL_CLUSTER=etcd0=http://192.168.12.50:2380,etcd1=http://192.168.12.51:2380,etcd2=http://192.168.12.52:2380 \
    -e ETCD_ENDPOINTS=192.168.12.50:2379,192.168.12.51:2379,192.168.12.52:2379 \
    -e PD_ADVERTISE_ADDR=192.168.12.50:1234 \
    pingcap/pd
```

node1
```
docker run -d -p 2379:2379 -p 2380:2380 -p 4001:4001 -p 1234:1234 --name pd \
    -e ETCD_NAME=etcd1
    -e ETCD_ADVERTISE_CLIENT_URLS=http://192.168.12.51:2379,http://192.168.12.51:4001 \
    -e ETCD_INITIAL_ADVERTISE_PEER_URLS=http://192.168.12.51:2380 \
    -e ETCD_INITIAL_CLUSTER_TOKEN=etcd-pd-cluster \
    -e ETCD_INITIAL_CLUSTER=etcd0=http://192.168.12.50:2380,etcd1=http://192.168.12.51:2380,etcd2=http://192.168.12.52:2380 \
    -e ETCD_ENDPOINTS=192.168.12.50:2379,192.168.12.51:2379,192.168.12.52:2379 \
    -e PD_ADVERTISE_ADDR=192.168.12.51:1234 \
    pingcap/pd
```

node2
```
docker run -d -p 2379:2379 -p 2380:2380 -p 4001:4001 -p 1234:1234 --name pd \
    -e ETCD_NAME=etcd2
    -e ETCD_ADVERTISE_CLIENT_URLS=http://192.168.12.52:2379,http://192.168.12.52:4001 \
    -e ETCD_INITIAL_ADVERTISE_PEER_URLS=http://192.168.12.52:2380 \
    -e ETCD_INITIAL_CLUSTER_TOKEN=etcd-pd-cluster \
    -e ETCD_INITIAL_CLUSTER=etcd0=http://192.168.12.50:2380,etcd1=http://192.168.12.51:2380,etcd2=http://192.168.12.52:2380 \
    -e ETCD_ENDPOINTS=192.168.12.50:2379,192.168.12.51:2379,192.168.12.52:2379 \
    -e PD_ADVERTISE_ADDR=192.168.12.52:1234 \
    pingcap/pd
```

A simple script [run_cluster.sh](./run_cluster.sh) can help you run these in local.
