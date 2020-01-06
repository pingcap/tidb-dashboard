#!/usr/bin/env bash

# This script embeds UI assets into Golang source file. UI assets must be already built
# before calling this script

set -euo pipefail

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
PROJECT_DIR="$(dirname "$DIR")"

# See https://github.com/golang/go/wiki/Modules#how-can-i-track-tool-dependencies-for-a-module

cd $PROJECT_DIR

export GOBIN=$PROJECT_DIR/bin
export PATH=$GOBIN:$PATH

echo "+ Preflight check"
if [ ! -d "ui/build" ]; then
  echo "  - Error: UI assets must be built first"
  exit 1
fi

echo "+ Install bindata tools"
go install github.com/elazarl/go-bindata-assetfs/go-bindata-assetfs
go install github.com/go-bindata/go-bindata/go-bindata

echo "+ Embed UI assets"
go-bindata-assetfs -pkg uiserver -prefix ui -tags ui_server ui/build/...
HANDLER_PATH=pkg/uiserver/embedded_assets_handler.go
mv bindata_assetfs.go $HANDLER_PATH
echo "  - Assets handler written to $HANDLER_PATH"
