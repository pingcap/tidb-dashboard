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

swagger:
	scripts/generate_swagger.sh

swagger_client: swagger
	cd ui && yarn && npm run build_api_client

ui: swagger_client
	cd ui && yarn && REACT_APP_DASHBOARD_API_URL="" npm run build

server:
ifeq ($(SWAGGER),1)
	make swagger
endif
ifeq ($(UI),1)
	scripts/embed_ui_assets.sh
endif
	go build -o bin/tidb-dashboard -tags "${BUILD_TAGS}" cmd/tidb-dashboard/main.go

run:
	bin/tidb-dashboard
