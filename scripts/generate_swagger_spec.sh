#!/usr/bin/env bash

# This script generates API client from the swagger annotation in the Golang server code.

set -euo pipefail

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
PROJECT_DIR=$(cd "$DIR/.."; pwd)

cd $PROJECT_DIR

echo "+ Generate swagger spec"
bin/swag init --parseDependency --parseDepth 1 --generalInfo cmd/tidb-dashboard/main.go --propertyStrategy snakecase \
  --exclude ui --output swaggerspec
