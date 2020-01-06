.PHONY: tidy ui server run

BUILD_TAGS ?=

ifeq ($(SWAGGER),1)
BUILD_TAGS += swagger_server
endif

ifeq ($(UI),1)
BUILD_TAGS += ui_server
endif

default:
	SWAGGER=1 make server

tidy:
	go mod tidy

swagger_spec:
	scripts/generate_swagger_spec.sh

yarn_dependencies:
	cd ui && yarn install --frozen-lockfile

swagger_client: swagger_spec yarn_dependencies
	cd ui && npm run build_api_client

ui: swagger_client
	cd ui && REACT_APP_DASHBOARD_API_URL="" npm run build

ui_for_pd: swagger_client
	cd ui && REACT_APP_DASHBOARD_API_URL="/dashboard" npm run build

server:
ifeq ($(SWAGGER),1)
	make swagger_spec
endif
ifeq ($(UI),1)
	scripts/embed_ui_assets.sh
endif
	go build -o bin/tidb-dashboard -tags "${BUILD_TAGS}" cmd/tidb-dashboard/main.go

run:
	bin/tidb-dashboard
