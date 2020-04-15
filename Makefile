.PHONY: lint dev yarn_dependencies ui server run

DASHBOARD_PKG := github.com/pingcap-incubator/tidb-dashboard

BUILD_TAGS ?=

SKIP_YARN_INSTALL ?=

LDFLAGS ?=

ifeq ($(UI),1)
	BUILD_TAGS += ui_server
endif

LDFLAGS += -X "$(DASHBOARD_PKG)/pkg/utils.ReleaseVersion=$(shell git describe --tags --dirty)"
LDFLAGS += -X "$(DASHBOARD_PKG)/pkg/utils.BuildTS=$(shell date -u '+%Y-%m-%d %I:%M:%S')"
LDFLAGS += -X "$(DASHBOARD_PKG)/pkg/utils.GitHash=$(shell git rev-parse HEAD)"
LDFLAGS += -X "$(DASHBOARD_PKG)/pkg/utils.GitBranch=$(shell git rev-parse --abbrev-ref HEAD)"

default: server

lint:
	scripts/lint.sh

dev: lint default

yarn_dependencies:
	cd ui &&\
	yarn install --frozen-lockfile

ui: yarn_dependencies
	cd ui &&\
	REACT_APP_DASHBOARD_API_URL="" yarn build

server:
	scripts/install_go_tools.sh
	scripts/generate_swagger_spec.sh
ifeq ($(UI),1)
	scripts/embed_ui_assets.sh
endif
	go build -o bin/tidb-dashboard -ldflags '$(LDFLAGS)' -tags "${BUILD_TAGS}" cmd/tidb-dashboard/main.go

run:
	bin/tidb-dashboard --debug
