FROM golang:1.18-alpine3.16 as builder

RUN apk add --no-cache \
    make \
    git \
    bash \
    curl \
    findutils \
    gcc \
    libc-dev \
    nodejs \
    npm \
    openjdk11

RUN npm install -g pnpm

RUN mkdir -p /go/src/github.com/pingcap/tidb-dashboard/ui
WORKDIR /go/src/github.com/pingcap/tidb-dashboard

# Cache go module dependencies.
COPY go.mod .
COPY go.sum .
RUN GO111MODULE=on go mod download

# Cache npm dependencies.
WORKDIR /go/src/github.com/pingcap/tidb-dashboard/ui
COPY ui/pnpm-lock.yaml .
RUN pnpm fetch

# Build.
WORKDIR /go/src/github.com/pingcap/tidb-dashboard
COPY . .
RUN make package PNPM_INSTALL_TAGS=--offline

FROM alpine:3.16

COPY --from=builder /go/src/github.com/pingcap/tidb-dashboard/bin/tidb-dashboard /tidb-dashboard

EXPOSE 12333

ENTRYPOINT ["/tidb-dashboard"]
