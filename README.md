# TiDB Dashboard

TiDB Dashboard is a Web UI for monitoring, diagnosing and managing TiDB cluster.

## Getting Started

The most easy way to use TiDB Dashboard with an existing TiDB cluster is to use the one embedded
into [PD]: http://127.0.0.1:2379/dashboard. Currently you need PD
master branch to use TiDB Dashboard.

Note: The TiDB Dashboard inside PD may be not up to date. To play with latest TiDB Dashboard, build
it from source (see next section).

## Contributing & Developing

If you're interested in contributing to TiDB Dashboard, checkout our [help wanted issues](https://github.com/pingcap-incubator/tidb-dashboard/issues?q=is%3Aopen+label%3Astatus%2Fhelp-wanted+sort%3Aupdated-desc)
for a list, in which we have also marked the difficulty level. We have prepared many suitable tasks.

For a detailed step-by-step contributing guide, or want to build TiDB Dashboard from source,
see [CONTRIBUTING.md](./CONTRIBUTING.md).

### ⭐️ TiDB Usability Challenge (March 2 ~ May 30) ⭐️

TiDB Dashboard is also a project of TiDB Usability Challenge (UCP), where you can win prizes by
contributing code!

- Learn more about TiDB Usability Challenge (UCP): [Chinese](https://pingcap.com/community-cn/tidb-usability-challenge/), [English](https://pingcap.com/community/tidb-usability-challenge/)
- See [TiDB Dashboard UCP issues](https://github.com/pingcap-incubator/tidb-dashboard/projects/17) that you can work with.

### Ask for Help

If you have any questions about development, feel free to join [TiDB Dashboard SIG]
(Special Interest Group):

- Slack (English): [#sig-dashboard](https://tidbcommunity.slack.com/messages/sig-dashboard)
- Slack (Chinese): [#sig-dashboard-china](https://tidbcommunity.slack.com/messages/sig-dashboard-china)

## Architecture

This repository contains both Dashboard HTTP API and Dashboard UI. Dashboard HTTP API is placed in
`pkg/` directory, written in Golang. Dashboard UI is placed in `ui/` directory, powered by React.

TiDB Dashboard can also be integrated into PD, as follows:

![](etc/arch_overview.svg)

## For Developers How To ...

### Keep session valid after rebooting the server

By default, the session secret key is generated dynamically when the server starts. This results in
invalidating your previously acquired session token. For easier development, you can supply a fixed
session secret key by setting `DASHBOARD_SESSION_SECRET` in the environment variable or in `.env`
file like:

```env
DASHBOARD_SESSION_SECRET=aaaaaaaaaabbbbbbbbbbccccccccccdd
```

The supplied secret key must be 32 bytes, otherwise it will not be effective.

Note: the maximum lifetime of a token is 24 hours by default, so you still need to acquire token
every 24 hours.

### Supply session token in the Swagger UI

1. Acquire a token first through `/user/login` in the Swagger UI.

2. Click the "Authorize" button in the Swagger UI, set value to `Bearer xxxx` where `xxxx` is the
   token you acquired in step 1.

   <img src="etc/readme_howto_swagger_session.jpg" width="400">

### Release new UI assets

Simply modify `ui/.github_release_version`. The assets will be released automatically after your
change is merged to master.

[tidb dashboard sig]: https://github.com/pingcap/community/tree/master/special-interest-groups/sig-dashboard
[pd]: https://github.com/pingcap/pd
