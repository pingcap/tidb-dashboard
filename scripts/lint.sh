#!/usr/bin/env bash

# This script run lints.

set -euo pipefail

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
PROJECT_DIR="$(dirname "$DIR")"

cd $PROJECT_DIR

LINT_BIN=./bin/golangci-lint
<<<<<<< HEAD
REQUIRED_VERSION=2.4.0
=======
REQUIRED_VERSION=2.15.0
>>>>>>> a2c7919ba (chore: update Go version to 1.27.3 (#1967))
NEED_DOWNLOAD=true

echo "+ Check golangci-lint binary"
if [[ -f "${LINT_BIN}" ]]; then
  if ${LINT_BIN} --version | grep -qF ${REQUIRED_VERSION}; then
    NEED_DOWNLOAD=false
  fi
fi

if [ "${NEED_DOWNLOAD}" = true ]; then
  echo "  - Install golangci-lint"
  GO_TOOLCHAIN="$(go env GOVERSION)"
  GOBIN="${PROJECT_DIR}/bin" GOTOOLCHAIN="${GO_TOOLCHAIN}" \
    go install "github.com/golangci/golangci-lint/v2/cmd/golangci-lint@v${REQUIRED_VERSION}"
fi

echo "+ Run lints for Go source code"
${LINT_BIN} run --fix --timeout=10m

echo "+ Clean up go mod"
go mod tidy
