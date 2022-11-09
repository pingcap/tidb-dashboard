DASHBOARD_PKG := github.com/pingcap/tidb-dashboard

BUILD_TAGS ?=

PNPM_INSTALL_TAGS ?=

LDFLAGS ?=

FEATURE_VERSION ?= 6.2.0

WITHOUT_NGM ?= false

E2E_SPEC ?=

RELEASE_VERSION := $(shell grep -v '^\#' ./release-version)

LDFLAGS += -X "$(DASHBOARD_PKG)/pkg/utils/version.InternalVersion=$(RELEASE_VERSION)"
LDFLAGS += -X "$(DASHBOARD_PKG)/pkg/utils/version.Standalone=Yes"
LDFLAGS += -X "$(DASHBOARD_PKG)/pkg/utils/version.PDVersion=N/A"
LDFLAGS += -X "$(DASHBOARD_PKG)/pkg/utils/version.BuildTime=$(shell date -u '+%Y-%m-%d %I:%M:%S')"
LDFLAGS += -X "$(DASHBOARD_PKG)/pkg/utils/version.BuildGitHash=$(shell git rev-parse HEAD)"

TIDB_VERSION ?= latest

# Docker build variables.
IMAGE ?= pingcap/tidb-dashboard:$(RELEASE_VERSION)
AMD64 := linux/amd64
ARM64 := linux/arm64
PLATFORMS := $(AMD64),$(ARM64)
# If you want to build with no cache (after update go module, npm module, etc.), set "NO_CACHE=--pull --no-cache".
NO_CACHE ?=

default: server

.PHONY: clean
clean:
	rm -rf ./coverage

.PHONY: install_tools
install_tools:
	scripts/install_go_tools.sh

.PHONY: lint
lint:
	scripts/lint.sh

.PHONY: test
test: clean unit_test integration_test

.PHONY: unit_test
unit_test:
	@mkdir -p ./coverage
	GO111MODULE=on go test -v -cover -coverprofile=coverage/unit_test.txt ./pkg/... ./util/...

.PHONY: integration_test
integration_test:
	@mkdir -p ./coverage
	@TIDB_VERSION=${TIDB_VERSION} tests/run.sh

.PHONY: e2e_test
e2e_test:
	@if $(WITHOUT_NGM); then\
		make e2e_without_ngm_test;\
	else\
		make e2e_compat_features_test;\
		make e2e_common_features_test;\
	fi

.PHONY: e2e_compat_features_test
e2e_compat_features_test:
	cd ui &&\
	pnpm i &&\
	cd packages/tidb-dashboard-for-op &&\
	pnpm run:e2e-test:compat-features --env FEATURE_VERSION=$(FEATURE_VERSION) TIDB_VERSION=$(TIDB_VERSION)

.PHONY: e2e_common_features_test
e2e_common_features_test:
	cd ui &&\
	pnpm i &&\
	cd packages/tidb-dashboard-for-op &&\
	pnpm run:e2e-test:common-features --env TIDB_VERSION=$(TIDB_VERSION)

.PHONY: e2e_without_ngm_test
e2e_without_ngm_test:
	cd ui &&\
	pnpm i &&\
	cd packages/tidb-dashboard-for-op &&\
	pnpm run:e2e-test:without-ngm --env TIDB_VERSION=$(TIDB_VERSION) WITHOUT_NGM=$(WITHOUT_NGM)

.PHONY: e2e_test_specify
e2e_test_specify:
	cd ui &&\
	pnpm i &&\
	cd packages/tidb-dashboard-for-op &&\
	pnpm run:e2e-test:specify --env TIDB_VERSION=$(TIDB_VERSION) -- --spec $(E2E_SPEC)

.PHONY: dev
dev: lint default

.PHONY: ui_deps
ui_deps: install_tools
	cd ui &&\
	pnpm i ${PNPM_INSTALL_TAGS}

.PHONY: ui
ui: ui_deps
	cd ui &&\
	pnpm build

.PHONY: go_generate
go_generate: export PATH := $(shell pwd)/bin:$(PATH)
go_generate:
	scripts/generate_swagger_spec.sh
	go generate -x ./...

.PHONY: server
server: install_tools go_generate
	go build -o bin/tidb-dashboard -ldflags '$(LDFLAGS)' -tags "${BUILD_TAGS}" cmd/tidb-dashboard/main.go

.PHONY: embed_ui_assets
embed_ui_assets: ui
	scripts/embed_ui_assets.sh

.PHONY: package # Build frontend and backend server, and then packages them into a single binary.
package: BUILD_TAGS += ui_server
package: embed_ui_assets server

.PHONY: docker-image # For locally dev, set IMAGE to your dev docker registry.
docker-image: clean
	docker buildx build ${NO_CACHE} --push -t $(IMAGE) --platform $(PLATFORMS) .

.PHONY: docker-image-amd64
docker-image-amd64: clean
	docker buildx build ${NO_CACHE} --load -t $(IMAGE) --platform $(AMD64) .
	docker run --rm $(IMAGE) -v

.PHONY: docker-image-arm64
docker-image-arm64: clean
	docker buildx build ${NO_CACHE} --load -t $(IMAGE) --platform $(ARM64) .
	docker run --rm $(IMAGE) -v

.PHONY: run # please ensure that tiup playground is running in the background.
run:
	bin/tidb-dashboard --debug --experimental --feature-version "$(FEATURE_VERSION)" --host 0.0.0.0
