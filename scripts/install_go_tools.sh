#!/usr/bin/env bash

set -euo pipefail

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
PROJECT_DIR=$(cd "$DIR/.."; pwd)

# See https://github.com/golang/go/wiki/Modules#how-can-i-track-tool-dependencies-for-a-module

cd $PROJECT_DIR/scripts

export GOBIN=$PROJECT_DIR/bin
export PATH=$GOBIN:$PATH

echo "+ Install go tools"
grep '_' tools.go | sed 's/"//g' | awk '{print $2}' | xargs -t -L 1 go install

echo "+ Clean up go mod"
go mod tidy
