FROM golang:1.6

MAINTAINER siddontang

COPY . /go/src/github.com/pingcap/pd

RUN cd /go/src/github.com/pingcap/pd/ && \
    go build -o bin/pd-server pd-server/main.go && \
    cp -f ./bin/pd-server /go/bin/pd-server 

EXPOSE 1234

ENTRYPOINT ["pd-server"]

