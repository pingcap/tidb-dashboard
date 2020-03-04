#!/usr/bin/env bash

# This script embeds diagnose report template into Golang source file. Diagnose report template must already exist
# before calling this script.
#

set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
PROJECT_DIR="$(dirname "$DIR")"

# See https://github.com/golang/go/wiki/Modules#how-can-i-track-tool-dependencies-for-a-module

cd "$PROJECT_DIR"

export GOBIN=$PROJECT_DIR/bin
export PATH=$GOBIN:$PATH

echo "+ Preflight check"
if [ ! -d "pkg/apiserver/diagnose/templates" ]; then
  echo "  - Error: Diagnose templates not exists"
  exit 1
fi

echo "+ Install bindata tools"
go install github.com/elazarl/go-bindata-assetfs/go-bindata-assetfs
go install github.com/go-bindata/go-bindata/go-bindata

echo "+ Clean up go mod"
go mod tidy

echo "+ Embed diagnose report"

go-bindata-assetfs -pkg diagnose -prefix ../ pkg/apiserver/diagnose/templates/...
HANDLER_PATH=pkg/apiserver/diagnose/embedded_diagnose_report_template.go
mv bindata_assetfs.go $HANDLER_PATH
echo "  - Diagnose written to $HANDLER_PATH"
