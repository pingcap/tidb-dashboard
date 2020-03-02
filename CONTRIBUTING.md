# Contributing to TiDB Dashboard

Thanks for your interest in contributing to TiDB Dashboard! This document outlines some of the conventions on building, running, and testing TiDB Dashboard, the development workflow, commit message formatting, contact points and other resources.

If you need any help or mentoring getting started, understanding the codebase, or making a PR (or anything else really), please ask in `#sig-dashboard` channel on [Slack](https://join.slack.com/t/tidbcommunity/shared_invite/enQtNzc0MzI4ODExMDc4LWYwYmIzMjZkYzJiNDUxMmZlN2FiMGJkZjAyMzQ5NGU0NGY0NzI3NTYwMjAyNGQ1N2I2ZjAxNzc1OGUwYWM0NzE).

## Building and setting up a development workspace

TiDB Dasboard is a web interface which integrate into PD by default, andd can be deploy standalone. Its back-end is written in [Golang](https://golang.org/) with [Gin](https://github.com/gin-gonic/gin), front-end is written in [Typescript](https://www.typescriptlang.org/) with [React](https://github.com/facebook/react). It uses [swaggo](https://github.com/swaggo/swag) and [openapi-generator](https://github.com/OpenAPITools/openapi-generator) for automaticly generating API documents and API client. Also, to provide consistency, we use linters and automated formatting tools.

### Prerequisites

To build TiDB Dashboard you'll need to at least have the following installed:

- `git` - Version control
- `make` - Build tool (run common workflows)
- [`golang`](https://golang.org/) - Golang (require 1.13+)
- [`node.js`](https://nodejs.org/) - Javascript runtime (require 12+)

### Getting the repository

```bash
git clone https://github.com/pingcap-incubator/tidb-dashboard.git
cd tidb-dashboard
# Future instructions assume you are in this directory
```

### Preparing environment

Optional: set Taobao's npm mirror registry to speed up package downloading if needed

```bash
npm config set registry https://registry.npm.taobao.org
```

Install yarn

```bash
npm install yarn -g
```

Install Openapi-generator

```bash
npm install @openapitools/openapi-generator-cli -g
```

**IMPORTANT**: TiDB Dashboard uses packages from GitHub Packages. you need to configure the ~/.npmrc in order to install these packages.

1. Create a personal access token

Follow personal ["Settings" -> "Developer settings" -> "Personal access tokens" -> "Generate new token"](https://github.com/settings/tokens/new) path, the "Select scopes" must select `repo` and `read:packages` at least.

2. Edit `~/.npmrc`, add a new line by the following content

```
//npm.pkg.github.com/:_authToken=[YOUR_PERSONAL_ACCESS_TOKEN]
```

### Building and running

At this point, you can build and run TiDB Dashboard. 

> Note: TiDB Dashboard need a running TiDB cluster as target, before continue, see [how to start a local TiDB cluster](#starting-a-tidb-cluster).

Build and run back-end server:

```bash
make
make run
# Now tidb-dashboard server is listen on 127.0.0.1:12333
```

For front-end, you should build API client and start a React develpment server:

```bash
make swagger_client
cd ui
npm run start
# Now tidb-dashboard UI is available in 127.0.0.1:3000
```

When you're ready to test out your changes, use the `dev` task. It will lint your code and verify the UI building.

```bash
    
```

See the [style doc](https://github.com/golang/go/wiki/CodeReviewComments) for details on the conventions.

Please follow this style to make TiDB Dashboard easy to review, maintain, and develop.

### Starting a TiDB cluster

To run TiDB Dashboard, you also need run a local TiDB cluster (at least 1 TiDB server), here we introduce how to start a local TiDB cluster by binary deployment. Also, you can use other ways like [docker-compose](https://github.com/pingcap/tidb-docker-compose#quick-start) or [TiUP](https://tiup.io).

Download all needed files (Do not save them in `tidb-dashboard` folder):

```bash
# Download the package.
wget https://download.pingcap.org/tidb-latest-linux-amd64.tar.gz
# Extract the package.
tar -xzf tidb-latest-linux-amd64.tar.gz
cd tidb-latest-linux-amd64
```

You can simply start 1 TiDB server for testing:

```bash
./bin/tidb-server --log-file=tidb.log
# Now tidb-server is listen on port 4000
```

Or start a local TiDB cluster with 1 TiDB, 1 TiKV and 1 PD:

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

-------

Use `mysql-client` to check if `tidb-server` is on:

```bash
mysql -h 127.0.0.1 -P 4000 -uroot
```

Now, you are able to login TiDB dashboard with TiDB root user.

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

If the change affects more than one subsystem, you can use comma to separate them like `util/codec,util/types:`.

If the change affects many subsystems, you can use `*` instead, like `*:`.

The body of the commit message should describe why the change was made and at a high level, how the code works.

### Signing off the Commit

The project uses [DCO check](https://github.com/probot/dco#how-it-works) and the commit message must contain a `Signed-off-by` line for [Developer Certificate of Origin](https://developercertificate.org/).

Use option `git commit -s` to sign off your commits.
