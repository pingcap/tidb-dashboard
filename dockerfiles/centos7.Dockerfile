FROM centos:7 as builder

RUN yum -y update
RUN yum -y groupinstall "Development Tools"

# Install golang.
RUN export ARCH=$(arch | sed s/aarch64/arm64/ | sed s/x86_64/amd64/) && \
    export GO_VERSION=1.19.5 && \
    curl -OL https://golang.org/dl/go$GO_VERSION.linux-$ARCH.tar.gz && \
    tar -C / -xzf go$GO_VERSION.linux-$ARCH.tar.gz && \
    rm -f go$GO_VERSION.linux-$ARCH.tar.gz
ENV PATH /go/bin:$PATH
ENV GOROOT /go

# Install nodejs.
RUN curl -fsSL https://rpm.nodesource.com/setup_16.x | bash -
RUN yum -y install nodejs
RUN npm install -g pnpm

# Install java.
COPY centos.adoptium.repo /etc/yum.repos.d/adoptium.repo
RUN yum -y install temurin-17-jdk

RUN mkdir -p /go/src/github.com/pingcap/tidb-dashboard/ui
WORKDIR /go/src/github.com/pingcap/tidb-dashboard

# Cache go module dependencies.
COPY ../go.mod .
COPY ../go.sum .
RUN GO111MODULE=on go mod download

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
RUN make package PNPM_INSTALL_TAGS=--offline

FROM centos:8

COPY --from=builder /go/src/github.com/pingcap/tidb-dashboard/bin/tidb-dashboard /tidb-dashboard

EXPOSE 12333

ENTRYPOINT ["/tidb-dashboard"]
