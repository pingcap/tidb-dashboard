.PHONY: install_tools lint dev yarn_dependencies ui server run test unit_test integration_test

DASHBOARD_PKG := github.com/pingcap/tidb-dashboard

BUILD_TAGS ?=

LDFLAGS ?=

ifeq ($(UI),1)
	BUILD_TAGS += ui_server
endif

LDFLAGS += -X "$(DASHBOARD_PKG)/pkg/utils/version.InternalVersion=$(shell grep -v '^\#' ./release-version)"
LDFLAGS += -X "$(DASHBOARD_PKG)/pkg/utils/version.Standalone=Yes"
LDFLAGS += -X "$(DASHBOARD_PKG)/pkg/utils/version.PDVersion=N/A"
LDFLAGS += -X "$(DASHBOARD_PKG)/pkg/utils/version.BuildTime=$(shell date -u '+%Y-%m-%d %I:%M:%S')"
LDFLAGS += -X "$(DASHBOARD_PKG)/pkg/utils/version.BuildGitHash=$(shell git rev-parse HEAD)"

INTEGRATION_TEST_PACKAGES := "github.com\/pingcap\/tidb-dashboard\/tests"

default: server

install_tools:
	scripts/install_go_tools.sh

lint:
	scripts/lint.sh

test: unit_test integration_test

unit_test:
	GO111MODULE=on go test -v $$(go list ./... | grep -v $(INTEGRATION_TEST_PACKAGES))

integration_test: server
	@tests/run.sh

dev: lint default

yarn_dependencies: install_tools
	cd ui &&\
	yarn install --frozen-lockfile

ui: yarn_dependencies
	cd ui &&\
	yarn build

server: install_tools
	scripts/generate_swagger_spec.sh
ifeq ($(UI),1)
	scripts/embed_ui_assets.sh
endif
	go build -o bin/tidb-dashboard -ldflags '$(LDFLAGS)' -tags "${BUILD_TAGS}" cmd/tidb-dashboard/main.go

run:
	bin/tidb-dashboard --debug --experimental --feature-version "6.0.0"
