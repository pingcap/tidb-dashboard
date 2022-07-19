#!/usr/bin/env bash

set -euo pipefail

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
PROJECT_DIR="$(dirname "$DIR")"

API_SPEC_DIR=$PROJECT_DIR/swagger/spec.json
OPENAPI_CONFIG_DIR=$PROJECT_DIR/swagger/.openapi_config.yaml
OUTPUT_DIR=$PROJECT_DIR/src/client/api

cd $PROJECT_DIR/swagger

# touch spec.json && rm spec.json

# curl -o spec.json -fsSL http://clinic-staging-1072990385.us-west-2.elb.amazonaws.com:8085/swagger/doc.json

pnpm openapi-generator-cli generate -i $API_SPEC_DIR -g typescript-axios -c $OPENAPI_CONFIG_DIR -o $OUTPUT_DIR

rm -rf $OUTPUT_DIR/.openapi-generator
rm $OUTPUT_DIR/.gitignore
rm $OUTPUT_DIR/.npmignore
rm $OUTPUT_DIR/.openapi-generator-ignore
rm $OUTPUT_DIR/git_push.sh
