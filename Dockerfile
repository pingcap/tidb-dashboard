FROM golang:1.6

MAINTAINER siddontang

RUN cd /go/src && \
    git clone --depth=1 https://github.com/coreos/etcd.git github.com/coreos/etcd && \
    cd github.com/coreos/etcd && ./build && cp -f ./bin/etcd /go/bin/etcd

RUN go get -d github.com/pingcap/pd/server && \
    cd /go/src/github.com/pingcap/pd/ && \
    go build -o bin/pd-server pd-server/main.go && cp -f ./bin/pd-server /go/bin/pd-server

EXPOSE 2379 2380 4001 7001 1234

COPY start.sh /start.sh

RUN chmod +x /start.sh

ENTRYPOINT ["/start.sh"]

