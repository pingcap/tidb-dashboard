FROM golang:1.18-alpine as builder

RUN apk add --no-cache \
    make \
    git \
    bash \
    curl \
    findutils \
    gcc \
    libc-dev

RUN mkdir -p /go/src/github.com/pingcap/tidb-dashboard
WORKDIR /go/src/github.com/pingcap/tidb-dashboard

# Cache dependencies
COPY go.mod .
COPY go.sum .

RUN GO111MODULE=on go mod download

COPY . .

RUN make server

FROM alpine

COPY --from=builder /go/src/github.com/pingcap/tidb-dashboard/bin/tidb-dashboard /tidb-dashboard

EXPOSE 12333

ENTRYPOINT ["/tidb-dashboard"]
