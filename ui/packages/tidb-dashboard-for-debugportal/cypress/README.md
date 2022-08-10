# E2E Test

Since there are some features is different from version to version, we have `make e2e_compat_features_test` and `make e2e_common_features_test` to test features compatibility in different versions and common features in all versions, respectively.

## Install Cypress

The Cypress has been added to package.json, so just run `pnpm i` to install it. We use Cypress@8.5.0 here since the version>8.5.0 has an unstable server connection error, the related issue can be referred [here](https://github.com/cypress-io/cypress/issues/18464).

## Run Test

**Prerequisite**: TiDB Dashboard server has to be started before run cypress test.

### Open Test Runner to Run Test Locally

#### Test E2E with FEATURE_VERSION >= 5.3.0

```shell
# start frontend server
cd ui && pnpm dev
# start backend server
make dev && make run
# open cypress test runner
cd ui/pacakges/tidb-dashboard-for-op && pnpm open:cypress
```

#### Test E2E with FEATURE_VERSION < 5.3.0

```shell
# start frontend server
cd ui && pnpm dev
# start backend server
make dev && make run FEATURE_VERSION=5.0.0
# open cypress test runner
cd ui/pacakges/tidb-dashboard-for-op && pnpm open:cypress --env FEATURE_VERSION=5.0.0
```

Run test by choosing test file under `/integration` on cypress test runner, cypress will open a broswer to run e2e test.

### Run on CI

```shell
# start frontend server
make ui
# start backend server
UI=1 make && make run FEATURE_VERSION=${FEATURE_VERSION}
# run e2e_compat_features and e2e_common_features tests
make e2e_test FEATURE_VERSION=${FEATURE_VERSION}
```

### Upload Visual Test Snapshots

> TODO: Use the official cypress docker image to make sure visual test stable between operating systems.

Since there was no cypress image of m1 before. So we use github actions to generate the snapshots that we need for visual tests.

#### How to generate snapshots in GitHub Actions

1. Go to [tidb-dashboard Actions - Upload E2E Snapshots](https://github.com/pingcap/tidb-dashboard/actions/workflows/upload-e2e-snapshots.yaml)

2. Click "Run workflow"

3. Enter which git SHA you want the test to run on

4. Specify the test specs to generate the snapshots, base path is `${PROJECT_DIR}/ui/packages/tidb-dashboard-for-op/cypress/integration`

5. Enter the action after all jobs finished, download the e2e-snapshots artifact below.
