# Contributing to TiDB Dashboard

Thanks for your interest in contributing to TiDB Dashboard! This document outlines some of the conventions on building, running, and testing TiDB Dashboard, the development workflow, commit message formatting, contact points and other resources.

If you need any help or mentoring getting started, understanding the codebase, or making a PR (or anything else really), please ask in `#sig-dashboard` and `#sig-dashboard-china` channel on [Slack](https://join.slack.com/t/tidbcommunity/shared_invite/enQtNzc0MzI4ODExMDc4LWYwYmIzMjZkYzJiNDUxMmZlN2FiMGJkZjAyMzQ5NGU0NGY0NzI3NTYwMjAyNGQ1N2I2ZjAxNzc1OGUwYWM0NzE).

## Building and setting up a development workspace

TiDB Dashboard is a web based UI for TiDB clusters. It is integrated into [PD](https://github.com/pingcap/pd) by default. It can also be deployed as a standalone server. The back-end is written in [Golang](https://golang.org/) with [Gin web framework](https://github.com/gin-gonic/gin) and the front-end is written in [TypeScript](https://www.typescriptlang.org/) with [React](https://github.com/facebook/react). [swaggo](https://github.com/swaggo/swag) and [openapi-generator](https://github.com/OpenAPITools/openapi-generator) are used for automatically generating API documents and API client.

The following steps are describing how to develop TiDB Dashboard by running a self-built TiDB Dashboard server (i.e. standalone) along with a separated TiDB cluster.

### Prerequisites

To build TiDB Dashboard you'll need to at least have the following installed:

- `git` - Version control
- `make` - Build tool (run common workflows)
- [`Golang`](https://golang.org/) - Golang (require 1.13+)
- [`Node.js`](https://nodejs.org/) - Javascript runtime (require 12+)
- [`Yarn`](https://classic.yarnpkg.com/en/docs/install) - Javascript dependency management (require 1.21+)
- [`Java`](https://www.java.com/ES/download/) - depended by [openapi-generator](https://github.com/OpenAPITools/openapi-generator) (require 8+)

### Getting the repository

```bash
git clone https://github.com/pingcap-incubator/tidb-dashboard.git
```

Optional: set Taobao's npm mirror registry to speed up package downloading if needed

```bash
npm config set registry https://registry.npm.taobao.org
```

### Starting a TiDB cluster

To run TiDB Dashboard, you'd like to run a local TiDB cluster (at least 1 TiDB, 1 TiKV and 1 PD), here we introduce how to start a local TiDB cluster by [TiUP](https://tiup.io).

TiUP is the offical component manager for [TiDB](https://github.com/pingcap/tidb), which help you download binary files and run them.

Downlaod and install TiUP
```bash
curl --proto '=https' --tlsv1.2 -sSf https://tiup-mirrors.pingcap.com/install.sh | sh 
```

Start a local cluster
```bash
tiup run playground nightly
```

Now you successfully start a cluster, continue reading how to [build and run TiDB Dashboard](#building-and-running).

> Note: you might notice that there is a TiDB Dashboard integrated in PD (Default address: http://127.0.0.1:2379/dashboard), but we still need to start a standlone TiDB Dashboard for developing.

-------

Alternatively, you can deploy a cluster with binary files manually:

Download all needed files, but do not save them in `tidb-dashboard` folder, Choose 1 of 2:

For linux user:
```bash
wget https://download.pingcap.org/tidb-latest-linux-amd64.tar.gz
tar -xzf tidb-latest-linux-amd64.tar.gz
cd tidb-latest-linux-amd64
```

For Mac OS user: 
```bash
wget https://download.pingcap.org/tidb-nightly-darwin-amd64.tar.gz
wget https://download.pingcap.org/tikv-nightly-darwin-amd64.tar.gz
wget https://download.pingcap.org/pd-nightly-darwin-amd64.tar.gz
mkdir tidb-nightly-darwin-amd64
tar -xzf tidb-nightly-darwin-amd64.tar.gz -C tidb-nightly-darwin-amd64 --strip-components=1
tar -xzf tikv-nightly-darwin-amd64.tar.gz -C tidb-nightly-darwin-amd64 --strip-components=1
tar -xzf pd-nightly-darwin-amd64.tar.gz -C tidb-nightly-darwin-amd64 --strip-components=1
cd tidb-nightly-darwin-amd64
```

Then start a local TiDB cluster with 1 TiDB, 1 TiKV and 1 PD step by step:

Firstly start a pd-server:

```bash
./bin/pd-server --name=pd --data-dir=pd --client-urls=http://127.0.0.1:2379 --log-file=pd.log
# Now pd-server is listen on port 2379
```

Open a new terminal and start tikv-server:

```bash
./bin/tikv-server --addr="127.0.0.1:20160" --pd-endpoints="127.0.0.1:2379" --data-dir=tikv --log-file=./tikv.log
# Now tikv-server is listen on port 20160
```

Open a new terminal and start tidb-server:

```bash
./bin/tidb-server --store=tikv --path="127.0.0.1:2379" --log-file=tidb.log
# Now tidb-server is listen on port 4000
```

Use `mysql-client` to check if `tidb-server` is on:

```bash
mysql -h 127.0.0.1 -P 4000 -uroot
```

### Building and running

At this point, you can build and run TiDB Dashboard. 

> Note: If you want to debug TiDB Dashboard, it needs a running TiDB cluster as target, see [how to start a local TiDB cluster](#starting-a-tidb-cluster).

Build and run back-end server (future instructions assume you are in the `tidb-dashboard` directory):

```bash
make
make run
# Now tidb-dashboard server is listen on 127.0.0.1:12333
```

For front-end, you should build API client and start a React development server:

```bash
make swagger_spec # Generate swagger file
cd ui
yarn # Install all the dependencies
npm run build_api_client
npm run start
# Now tidb-dashboard UI is available on 127.0.0.1:3000
```

Now, you are able to login TiDB Dashboard with TiDB root user.

> Note: TiDB Dashboard use user `root` and **empty password** by default.

When you're ready to test out your changes, use the `dev` task. It will lint your code and verify the UI building.

```bash
make dev
```

See the [style doc](https://github.com/golang/go/wiki/CodeReviewComments) for details on the conventions.

Please follow this style to make TiDB Dashboard easy to review, maintain, and develop.

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

### Finding something to work on.

For beginners, we have prepared many suitable tasks for you. Checkout our [Help Wanted issues](https://github.com/pingcap-incubator/tidb-dashboard/issues?q=is%3Aopen+label%3Astatus%2Fhelp-wanted+sort%3Aupdated-desc) for a list, in which we have also marked the difficulty level.

If you are planning something big, for example, relates to multiple components or changes current behaviors, make sure to open an issue to discuss with us before going on.

### Format of the commit message

We follow a rough convention for commit messages that is designed to answer two
questions: what changed and why. The subject line should feature the what and
the body of the commit should describe the why.

    clusterinfo: add comment for variable declaration.
    
    Improve documentation.

The format can be described more formally as follows:

    <subsystem>: <what changed>
    <BLANK LINE>
    <why this change was made>
    <BLANK LINE>
    Signed-off-by: <Name> <email address>

The first line is the subject and should be no longer than 50 characters, the other lines should be wrapped at 72 characters (see [this blog post](https://preslav.me/2015/02/21/what-s-with-the-50-72-rule/) for why).

If the change affects more than one subsystem, you can use comma to separate them like `keyviz`.

If the change affects many subsystems, you can use `*` instead, like `*:`.

The body of the commit message should describe why the change was made and at a high level, how the code works.
