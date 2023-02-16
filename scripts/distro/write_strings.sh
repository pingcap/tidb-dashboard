#!/usr/bin/env bash

# This script outputs distribution strings to json which is required for the frontend.

set -euo pipefail

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
PROJECT_DIR=$(cd "$DIR/../.."; pwd)

TARGET="${PROJECT_DIR}/ui/packages/tidb-dashboard-for-op/src/utils/distro/strings_res.json"

echo "+ Write distro strings"
cd "$PROJECT_DIR"
go run scripts/distro/write_strings.go -o="${TARGET}"

echo "  - Success! Distro strings:"
cat "${TARGET}"

echo
