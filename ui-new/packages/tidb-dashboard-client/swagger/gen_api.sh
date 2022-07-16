#!/usr/bin/env bash

set -euo pipefail

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
PROJECT_DIR="$(dirname "$DIR")"

SPEC_SOURCE_PATH=$PROJECT_DIR/../../../swaggerspec/swagger.json
SPEC_TARGET_PATH=$PROJECT_DIR/swagger/spec.json
OPENAPI_CONFIG_DIR=$PROJECT_DIR/swagger/.openapi_config.yaml
OUTPUT_DIR=$PROJECT_DIR/src/client/api
OUTPUT_MODELS_DIR=$PROJECT_DIR/src/client/api/models
LIB_MODELS_DIR=$PROJECT_DIR/../tidb-dashboard-lib/src/client/

cd $PROJECT_DIR/swagger

# copy spec if spec source exists
if [ -f "$SPEC_SOURCE_PATH" ]; then
  cp $SPEC_SOURCE_PATH $SPEC_TARGET_PATH
fi

# gen api
pnpm openapi-generator-cli generate -i $SPEC_TARGET_PATH -g typescript-axios -c $OPENAPI_CONFIG_DIR -o $OUTPUT_DIR

# copy models to tidb-dashboard-lib
cp -r $OUTPUT_MODELS_DIR $LIB_MODELS_DIR

# clean
rm -rf $OUTPUT_DIR/.openapi-generator
rm $OUTPUT_DIR/.gitignore
rm $OUTPUT_DIR/.npmignore
rm $OUTPUT_DIR/.openapi-generator-ignore
rm $OUTPUT_DIR/git_push.sh
