#!/usr/bin/env bash

# This script run lints.

set -euo pipefail

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
PROJECT_DIR="$(dirname "$DIR")"

cd $PROJECT_DIR

LINT_BIN=./bin/golangci-lint
REQUIRED_VERSION=1.23.3
NEED_DOWNLOAD=true

echo "+ Clean up go mod"
go mod tidy

echo "+ Run lints"
${LINT_BIN} run --fix

echo "+ Clean up go mod"
go mod tidy
