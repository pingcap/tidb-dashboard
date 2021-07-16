#!/usr/bin/env bash

set -euo pipefail

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
PROJECT_DIR="$(dirname "$DIR")"

cd $PROJECT_DIR

echo "+ Preflight check"
if [ -z "${DISTRIBUTION_DIR}" ] || [ ! -d ${DISTRIBUTION_DIR} ]; then
  echo "  - Error: DISTRIBUTION_DIR must be specified"
  exit 1
fi

echo "+ Replace distro resource"

cp -f "${DISTRIBUTION_DIR}/logo.svg" "${PROJECT_DIR}/ui/dashboardApp/layout/signin/logo.svg"
cp -f "${DISTRIBUTION_DIR}/logo-icon-light.svg" "${PROJECT_DIR}/ui/dashboardApp/layout/main/Sider/logo-icon-light.svg"
cp -f "${DISTRIBUTION_DIR}/favicon.ico" "${PROJECT_DIR}/ui/public/favicon.ico"
cp -f "${DISTRIBUTION_DIR}/distribution.yaml" "${PROJECT_DIR}/ui/lib/distribution.yaml"

echo "  - Success!"
