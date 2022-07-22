# Contributing to TiDB Dashboard

Thanks for your interest in contributing to TiDB Dashboard! This document outlines some of the conventions on building, running, and testing TiDB Dashboard, the development workflow, commit message formatting, contact points and other resources.

If you need any help (for example, mentoring getting started or understanding the codebase), feel free to reach out on the [TiDB Internals forum](https://internals.tidb.io/).

## Setting up a development workspace

The following steps are describing how to develop TiDB Dashboard by running a self-built and standalone TiDB Dashboard server along with a separated TiDB cluster ([TiDB] + [TiKV] + [PD]). TiDB Dashboard cannot work without a TiDB cluster.

Although TiDB Dashboard can also be integrated into [PD], this form is not convenient for developing. Thus we will not cover it here.

### Step 1. Start a TiDB cluster

[TiUP] is the offical component manager for [TiDB]. It can help you set up a local TiDB cluster in a few minutes.

Download and install TiUP:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://tiup-mirrors.pingcap.com/install.sh | sh
```

Declare the global environment variable:

> **Note:**
>
> After the installation, TiUP displays the absolute path of the corresponding `profile` file. You need to modify the following `source` command according to the path.

```bash
source ~/.bash_profile
```

Start a local TiDB cluster:

```bash
tiup playground nightly
```

You might notice that there is already a TiDB Dashboard integrated into the PD started by TiUP. For development purpose, it will not be used intentionally.

### Step 2. Prepare Prerequisites

The followings are required for developing TiDB Dashboard:

- git - Version control
- make - Build tool (run common workflows)
- [Golang 1.15+](https://golang.org/) - To compile the server.
- [Node.js 16+](https://nodejs.org/) - To compile the front-end.
- [PNPM 7](https://pnpm.io/) - To manage front-end dependencies.
- [Java 8+](https://www.java.com/ES/download/) - To generate JavaScript API client by OpenAPI specification.

### Step 3. Build and Run TiDB Dashboard

1. Clone the repository:

   ```bash
   git clone https://github.com/pingcap/tidb-dashboard.git
   cd tidb-dashboard
   ```

1. Build and run TiDB Dashboard back-end server:

   ```bash
   # In tidb-dashboard directory:
   make dev && make run
   ```
   If you meet up with an error like
   ```
   2022/07/22 09:48:01 internal error: package "context" without types was imported from "github.com/pingcap/tidb-dashboard/util/topo" util/topo/provider.go:20: running "mockery": exit status 1
   ```
   This is because some depedencies we are using [does not support go 1.18](https://github.com/vektra/mockery/issues/434), you may downgrade your go version to go 1.17 with [gvm](https://github.com/moovweb/gvm).

1. Build and run front-end server in a new terminal:

   ```bash
   # In tidb-dashboard directory:
   cd ui
   pnpm i # install all dependencies
   pnpm dev
   ```

1. That's it! You can access TiDB Dashboard now: http://127.0.0.1:3001

### Step 4. Run E2E Tests (optional)

When back-end server and front-end server are both started, E2E tests can be run by:

```bash
cd ui/packages/tidb-dashboard-for-op
pnpm open:cypress
```

> Now we have only a few e2e tests. Contributions are welcome!

## Additional Guides

### Style Guidelines

This project follows the [Uber's Golang style guide](https://github.com/uber-go/guide/blob/master/style.md). Please refer to [its documentation](https://github.com/uber-go/guide/blob/master/style.md) for details.

### Swagger UI

We use [Swagger] to generate the API server and corresponding clients. Swagger provides a web UI in which you can
see all TiDB Dashboard API endpoints and specifications, or even send API requests.

Swagger UI is available at http://localhost:12333/dashboard/api/swagger after the above Step 3 is finished.

## Contribution flow

This is a rough outline of what a contributor's workflow looks like:

- Create a Git branch from where you want to base your work. This is usually master.

- Write code, add test cases, and commit your work (see below for message format).

- Run lints and / or formatters.

  - Backend:

    ```bash
    # In tidb-dashboard directory:
    make dev
    ```

  - Frontend:

    ```bash
    # In ui directory:
    pnpm fmt
    ```

    > Recommended to install [Prettier plugin](https://prettier.io/docs/en/editors.html) for your editor so that there will be auto format on save.

- Run tests and make sure all tests pass.

- Push your changes to a branch in your fork of the repository and submit a pull request.

- Your PR will be reviewed by two maintainers, who may request some changes.

  - Once you've made changes, your PR must be re-reviewed and approved.

  - If the PR becomes out of date, you can use GitHub's 'update branch' button.

  - If there are conflicts, you can rebase (or merge) and resolve them locally. Then force push to your PR branch.
    You do not need to get re-review just for resolving conflicts, but you should request re-review if there are significant changes.

- Our CI system automatically tests all pull requests.

- If all tests passed and got an approval, reviewers will merge your PR.

Thanks for your contributions!

### Finding something to work on

For beginners, we have prepared many suitable tasks for you. Checkout our [help wanted issues](https://github.com/pingcap/tidb-dashboard/issues?q=is%3Aopen+label%3Astatus%2Fhelp-wanted+sort%3Aupdated-desc) for a list, in which we have also marked the difficulty level.

If you are planning something big, for example, relates to multiple components or changes current behaviors, make sure to open an issue to discuss with us before going on.

### Format of the commit message

We follow a rough convention for commit messages that is designed to answer two
questions: what changed and why. The subject line should feature the what and
the body of the commit should describe the why.

```plain
cluster: add comment for variable declaration.

Improve documentation.
```

The format can be described more formally as follows:

```plain
<subsystem>: <what changed>
<BLANK LINE>
<why this change was made>
<BLANK LINE>
```

If the change affects more than one subsystem, you can use comma to separate them like `keyviz, cluster: foo`.

If the change affects many subsystems, you can use `*` instead, like `*: foo`.

The body of the commit message should describe why the change was made and at a high level, how the code works.

[pd]: https://github.com/pingcap/pd
[tidb]: https://github.com/pingcap/tidb
[tikv]: https://github.com/tikv/tikv
[tiup]: https://tiup.io
[swagger]: https://swagger.io
