FROM golang:1.21-alpine3.16 as builder

RUN apk add --no-cache \
    make \
    git \
    bash \
    curl \
    findutils \
    gcc \
    libc-dev \
    nodejs=16.17.1-r0 \
    npm \
    openjdk11

RUN npm install -g pnpm@7.30.5

RUN mkdir -p /go/src/github.com/pingcap/tidb-dashboard/ui
WORKDIR /go/src/github.com/pingcap/tidb-dashboard

# Cache go module dependencies.
COPY ../go.mod .
COPY ../go.sum .
RUN go mod download

# Cache go tools.
COPY ../scripts scripts/
RUN scripts/install_go_tools.sh

# Cache npm dependencies.
WORKDIR /go/src/github.com/pingcap/tidb-dashboard/ui
COPY ../ui/pnpm-lock.yaml .
RUN pnpm fetch

# Build.
WORKDIR /go/src/github.com/pingcap/tidb-dashboard
COPY .. .
RUN make package

FROM alpine:3.16

COPY --from=builder /go/src/github.com/pingcap/tidb-dashboard/bin/tidb-dashboard /tidb-dashboard

EXPOSE 12333

ENTRYPOINT ["/tidb-dashboard"]
