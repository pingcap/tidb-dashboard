#!/usr/bin/env bash

# This script run lints.

set -euo pipefail

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
PROJECT_DIR="$(dirname "$DIR")"

cd $PROJECT_DIR

LINT_BIN=./bin/golangci-lint
REQUIRED_VERSION=1.23.8
NEED_DOWNLOAD=true

echo "+ Check golangci-lint binary"
if [[ -f "${LINT_BIN}" ]]; then
  if ${LINT_BIN} --version | grep -qF ${REQUIRED_VERSION}; then
    NEED_DOWNLOAD=false
  fi
fi

if [ "${NEED_DOWNLOAD}" = true ]; then
  echo "  - Download golangci-lint binary"
  curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s v${REQUIRED_VERSION}
fi

echo "+ Run lints"
${LINT_BIN} run --fix

echo "+ Clean up go mod"
go mod tidy
