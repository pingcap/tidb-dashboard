#!/usr/bin/env bash

set -euo pipefail

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
PROJECT_DIR="$(dirname "$DIR")"

API_DOC_DIR=$PROJECT_DIR/swagger/doc.json
OPENAPI_CONFIG_DIR=$PROJECT_DIR/swagger/.openapi_config.yaml
OUTPUT_DIR=$PROJECT_DIR/src/client/api

cd $PROJECT_DIR/swagger

pnpm openapi-generator-cli generate -i $API_DOC_DIR -g typescript-axios -c $OPENAPI_CONFIG_DIR -o $OUTPUT_DIR

rm -rf $OUTPUT_DIR/.openapi-generator
rm $OUTPUT_DIR/.gitignore
rm $OUTPUT_DIR/.npmignore
rm $OUTPUT_DIR/.openapi-generator-ignore
rm $OUTPUT_DIR/git_push.sh
