# E2E Test

Since there are some features is different from version to version, we have `e2e-test-features` and `e2e-test-compatibility` to test new features of latest version and compatibility of low version, respectively.

## Install Cypress

The Cypress has been added to package.json, so just run `yarn` to install it. We use Cypress@8.5.0 here since the version>8.5.0 has an unstable server connection error, the related issue can be referred [here](https://github.com/cypress-io/cypress/issues/18464).

## Run Test

**Prerequisite**: TiDB Dashboard server has to be started before run cypress test.

### Run Test Locally

#### Test E2E Features

```shell
# start frontend server
cd ui && yarn start
# start backend server
make dev && make run
# open cypress test runner
cd ui && yarn open:cypress
```

Run test by choosing test file under `integration/features` on cypress test runner, cypress will open a broswer to run e2e test.

#### Test E2E Compatibility

```shell
# start frontend server
cd ui && yarn start
# start backend server
make dev && TEST_COMPATIBILITY=1 make run
# open cypress test runner
cd ui && yarn open:cypress
```

Run test by choosing test file under `integration/compatibility` on cypress test runner, cypress will open a broswer to run e2e test.
