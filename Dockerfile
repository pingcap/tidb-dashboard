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

# Install pnpm for building the frontend.
RUN npm install -g pnpm

RUN mkdir -p /go/src/github.com/pingcap/tidb-dashboard
WORKDIR /go/src/github.com/pingcap/tidb-dashboard

# Cache dependencies.
COPY go.mod .
COPY go.sum .

RUN GO111MODULE=on go mod download

COPY . .

RUN make package

FROM alpine:3.16

COPY --from=builder /go/src/github.com/pingcap/tidb-dashboard/bin/tidb-dashboard /tidb-dashboard

EXPOSE 12333

ENTRYPOINT ["/tidb-dashboard"]
