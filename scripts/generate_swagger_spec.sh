#!/usr/bin/env bash

# This script generates API client from the swagger annotation in the Golang server code.

set -euo pipefail

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
PROJECT_DIR=$(cd "$DIR/.."; pwd)

# See https://github.com/golang/go/wiki/Modules#how-can-i-track-tool-dependencies-for-a-module

cd $PROJECT_DIR

echo "+ Generate swagger spec"
bin/swag init --generalInfo cmd/tidb-dashboard/main.go --exclude ui --output swaggerspec
