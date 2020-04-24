.PHONY: install_tools lint dev yarn_dependencies ui server run

DASHBOARD_PKG := github.com/pingcap-incubator/tidb-dashboard

BUILD_TAGS ?=

LDFLAGS ?=

ifeq ($(UI),1)
	BUILD_TAGS += ui_server
endif

LDFLAGS += -X "$(DASHBOARD_PKG)/pkg/utils.ReleaseVersion=$(shell git describe --tags --dirty)"
LDFLAGS += -X "$(DASHBOARD_PKG)/pkg/utils.BuildTS=$(shell date -u '+%Y-%m-%d %I:%M:%S')"
LDFLAGS += -X "$(DASHBOARD_PKG)/pkg/utils.GitHash=$(shell git rev-parse HEAD)"
LDFLAGS += -X "$(DASHBOARD_PKG)/pkg/utils.GitBranch=$(shell git rev-parse --abbrev-ref HEAD)"

default: server

install_tools:
	scripts/install_go_tools.sh

lint:
	scripts/lint.sh

dev: lint default

yarn_dependencies: install_tools
	cd ui &&\
	yarn install --frozen-lockfile

ui: yarn_dependencies
	cd ui &&\
	REACT_APP_DASHBOARD_API_URL="" yarn build

server: install_tools
	scripts/generate_swagger_spec.sh
ifeq ($(UI),1)
	scripts/embed_ui_assets.sh
endif
	go build -o bin/tidb-dashboard -ldflags '$(LDFLAGS)' -tags "${BUILD_TAGS}" cmd/tidb-dashboard/main.go

run:
	bin/tidb-dashboard --debug
