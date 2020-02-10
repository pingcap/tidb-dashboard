#!/usr/bin/env bash

# This script run lints.

set -euo pipefail

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
PROJECT_DIR="$(dirname "$DIR")"

# See https://github.com/golang/go/wiki/Modules#how-can-i-track-tool-dependencies-for-a-module

cd $PROJECT_DIR

export GOBIN=$PROJECT_DIR/bin
export PATH=$GOBIN:$PATH

echo "+ Install golangci-lint"
go install github.com/golangci/golangci-lint/cmd/golangci-lint

echo "+ Clean up go mod"
go mod tidy

echo "+ Run lints"
golangci-lint run --fix
