# Contributing to TiDB Dashboard

Thanks for your interest in contributing to TiDB Dashboard! This document outlines some of the conventions on building, running, and testing TiDB Dashboard, the development workflow, commit message formatting, contact points and other resources.

If you need any help (for example, mentoring getting started or understanding the codebase), feel free to join the discussion of [TiDB Dashboard SIG] (Special Interest Group):

- Slack (English): [#sig-dashboard](https://tidbcommunity.slack.com/messages/sig-dashboard)
- Slack (Chinese): [#sig-dashboard-china](https://tidbcommunity.slack.com/messages/sig-dashboard-china)

## Setting up a development workspace

The following steps are describing how to develop TiDB Dashboard by running a self-built and standalone TiDB Dashboard server along with a separated TiDB cluster ([TiDB] + [TiKV] + [PD]). TiDB Dashboard cannot work without a TiDB cluster.

Although TiDB Dashboard can also be integrated into [PD], this form is not convenient for developing. Thus we will not cover it here.

### Step 1. Start a TiDB cluster

#### Solution A. Use TiUP (Recommended)

[TiUP] is the offical component manager for [TiDB]. It can help you set up a local TiDB cluster in a few minutes.

Download and install TiUP:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://tiup-mirrors.pingcap.com/install.sh | sh
```

Start a local TiDB cluster:

```bash
tiup playground nightly
```

> Note: you might notice that there is already a TiDB Dashboard integrated into the PD started by TiUP. For development purpose, we will not use the that TiDB Dashboard. Please keep following the rest of the steps in this document.

#### Solution B. Download and Run Binary Manually

<details>

Alternatively, you can deploy a cluster with binary files manually.

1. Download binaries

   Linux:

   ```bash
   mkdir tidb_cluster
   cd tidb_cluster
   wget https://download.pingcap.org/tidb-nightly-linux-amd64.tar.gz
   tar -xzf tidb-nightly-linux-amd64.tar.gz
   cd tidb-nightly-linux-amd64
   ```

   MacOS:

   ```bash
   mkdir tidb_cluster
   cd tidb_cluster
   wget https://download.pingcap.org/tidb-nightly-darwin-amd64.tar.gz
   wget https://download.pingcap.org/tikv-nightly-darwin-amd64.tar.gz
   wget https://download.pingcap.org/pd-nightly-darwin-amd64.tar.gz
   mkdir tidb-nightly-darwin-amd64
   tar -xzf tidb-nightly-darwin-amd64.tar.gz -C tidb-nightly-darwin-amd64 --strip-components=1
   tar -xzf tikv-nightly-darwin-amd64.tar.gz -C tidb-nightly-darwin-amd64 --strip-components=1
   tar -xzf pd-nightly-darwin-amd64.tar.gz -C tidb-nightly-darwin-amd64 --strip-components=1
   cd tidb-nightly-darwin-amd64
   ```

2. Start a PD server

   ```bash
   ./bin/pd-server --name=pd --data-dir=pd --client-urls=http://127.0.0.1:2379 --log-file=pd.log
   # Now pd-server is listen on port 2379
   ```

3. Start a TiKV server

   Open a new terminal:

   ```bash
   ./bin/tikv-server --addr="127.0.0.1:20160" --pd-endpoints="127.0.0.1:2379" --data-dir=tikv --log-file=./tikv.log
   # Now tikv-server is listen on port 20160
   ```

4. Start a TiDB server

   Open a new terminal:

   ```bash
   ./bin/tidb-server --store=tikv --path="127.0.0.1:2379" --log-file=tidb.log
   # Now tidb-server is listen on port 4000
   ```

5. Use mysql-client to check everything works fine:

   ```bash
   mysql -h 127.0.0.1 -P 4000 -uroot
   ```

</details>

### Step 2. Prepare Prerequisites

The followings are required for developing TiDB Dashboard:

- git - Version control
- make - Build tool (run common workflows)
- [Golang 1.13+](https://golang.org/) - To compile the server.
- [Node.js 12+](https://nodejs.org/) - To compile the front-end.
- [Yarn 1.21+](https://classic.yarnpkg.com/en/docs/install) - To manage front-end dependencies.
- [Java 8+](https://www.java.com/ES/download/) - To generate JavaScript API client by OpenAPI specification.

### Step 3. Build and Run TiDB Dashboard

1. Clone the repository:

   ```bash
   git clone https://github.com/pingcap-incubator/tidb-dashboard.git
   cd tidb-dashboard
   ```

2. Build and run TiDB Dashboard back-end server:

   ```bash
   # In tidb-dashboard directory:
   make dev && make run
   ```

3. Build and run front-end server in a new terminal:

   ```bash
   # In tidb-dashboard directory:
   cd ui
   yarn  # install all dependencies
   npm run build_api_client  # build API client from OpenAPI spec
   npm start
   ```

   > Note: Currently the front-end server will not watch for Golang code changes, which means you must manually rebuild the API Client if back-end code is updated (for example, you pulled latest change from the repository):
   >
   > ```bash
   > npm run build_api_client
   > ```

4. That's it! You can access TiDB Dashboard now:

   TiDB Dashboard UI: http://127.0.0.1:3000

   > Note: If you encounter a rotating blue circle, don't worry. It may happen when you enter TiDB Dashboard UI for the first time. We are solving this problem. Now, you just need to refresh the page. Then, you can login TiDB Dashboard UI using user `root` and **empty password** by default.

   Swagger UI for TiDB Dashboard APIs: http://localhost:12333/dashboard/api/swagger

## Contribution flow

This is a rough outline of what a contributor's workflow looks like:

- Create a Git branch from where you want to base your work. This is usually master.
- Write code, add test cases, and commit your work (see below for message format).
- Run tests and make sure all tests pass.
- Push your changes to a branch in your fork of the repository and submit a pull request.
- Your PR will be reviewed by two maintainers, who may request some changes.
  - Once you've made changes, your PR must be re-reviewed and approved.
  - If the PR becomes out of date, you can use GitHub's 'update branch' button.
  - If there are conflicts, you can rebase (or merge) and resolve them locally. Then force push to your PR branch.
    You do not need to get re-review just for resolving conflicts, but you should request re-review if there are significant changes.
- Our CI system automatically tests all pull requests.
- If all tests passed and got more than two approvals. Reviewers will merge your PR.

Thanks for your contributions!

### Finding something to work on

For beginners, we have prepared many suitable tasks for you. Checkout our [help wanted issues](https://github.com/pingcap-incubator/tidb-dashboard/issues?q=is%3Aopen+label%3Astatus%2Fhelp-wanted+sort%3Aupdated-desc) for a list, in which we have also marked the difficulty level.

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

[tidb dashboard sig]: https://github.com/pingcap/community/tree/master/special-interest-groups/sig-dashboard
[pd]: https://github.com/pingcap/pd
[tidb]: https://github.com/pingcap/tidb
[tikv]: https://github.com/tikv/tikv
[tiup]: https://tiup.io
