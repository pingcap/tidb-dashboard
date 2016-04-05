FROM golang:1.6

MAINTAINER siddontang

RUN cd /go/src && \
    git clone --depth=1 https://github.com/coreos/etcd.git github.com/coreos/etcd && \
    cd github.com/coreos/etcd && ./build && cp -f ./bin/etcd* /go/bin/

RUN go get -d github.com/pingcap/pd/server && \
    cd /go/src/github.com/pingcap/pd/ && \
    go build -o bin/pd-server pd-server/main.go && cp -f ./bin/pd-server /go/bin/pd-server

EXPOSE 2379 2380 4001 7001 1234

COPY docker/start_pd.sh /start_pd.sh

RUN chmod +x /start_pd.sh

# For Etcd, see https://github.com/coreos/etcd/blob/master/Documentation/configuration.md
ENV ETCD_NAME="default"
ENV ETCD_ADVERTISE_CLIENT_URLS="http://localhost:2379,http://localhost:4001"
ENV ETCD_INITIAL_ADVERTISE_PEER_URLS="http://localhost:2380,http://localhost:7001"
ENV ETCD_INITIAL_CLUSTER="default=http://localhost:2380,default=http://localhost:7001"
ENV ETCD_INITIAL_CLUSTER_TOKEN="etcd-cluster"

# For pd.
ENV PD_ETCD_ENDPOINTS=
ENV PD_ADVERTISE_ADDR=

ENTRYPOINT ["/start_pd.sh"]

