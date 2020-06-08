# TiDB Dashboard
<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-2-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->

TiDB Dashboard is a Web UI for monitoring, diagnosing and managing TiDB cluster.

## Documentation

- [Product User Manual (Chinese)](https://pingcap.com/docs-cn/stable/dashboard/dashboard-intro/)
- [FAQ (Chinese)](https://pingcap.com/docs-cn/stable/dashboard/dashboard-faq/)

## Question, Suggestion, Support

Feel free to open issues in this repo for questions, suggestions and support. You may also consider join our community chat in the Slack channel [#sig-dashboard](https://slack.tidb.io/invite?team=tidb-community&channel=sig-dashboard&ref=github_dashboard_repo).

For Chinese users, you may also consider visiting PingCAP official user forum [AskTUG.com](https://asktug.com/) to make life easier.

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

If you have any questions about development, feel free to join [TiDB Dashboard SIG]
(Special Interest Group):

- Slack: [#sig-dashboard](https://slack.tidb.io/invite?team=tidb-community&channel=sig-dashboard&ref=github_dashboard_repo)

Thank you to all the people who already contributed to TiDB Dashboard!

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://github.com/Fullstop000"><img src="https://avatars1.githubusercontent.com/u/12471960?v=4" width="100px;" alt=""/><br /><sub><b>Fullstop000</b></sub></a><br /><a href="https://github.com/pingcap-incubator/tidb-dashboard/commits?author=Fullstop000" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/zzh-wisdom"><img src="https://avatars2.githubusercontent.com/u/52516344?v=4" width="100px;" alt=""/><br /><sub><b>zzh-wisdom</b></sub></a><br /><a href="https://github.com/pingcap-incubator/tidb-dashboard/commits?author=zzh-wisdom" title="Code">💻</a></td>
  </tr>
</table>

<!-- markdownlint-enable -->
<!-- prettier-ignore-end -->
<!-- ALL-CONTRIBUTORS-LIST:END -->

## Architecture

This repository contains both Dashboard HTTP API and Dashboard UI. Dashboard HTTP API is placed in
`pkg/` directory, written in Golang. Dashboard UI is placed in `ui/` directory, powered by React.

TiDB Dashboard can also be integrated into PD, as follows:

![](etc/arch_overview.svg)

## For Developers How to ...

### Change the base URL of Dashboard API endpoint

By default, the base URL of Dashboard API is `http://127.0.0.1:12333` if using `yarn start` to set up the dashboard for development. Sometimes you just want to change the URL for some reasons:

1. Use `.env`

   Add setting below into your `.env` file ( create one under `ui` if you don't have one already)

   ```shell
   REACT_APP_DASHBOARD_API_URL=your_new_endpoint
   ```

2. Use a environment variable

   Use a scoped or global environment variable to specify the `REACT_APP_DASHBOARD_API_URL` for convienience.

   ```shell
   REACT_APP_DASHBOARD_API_URL=your_new_endpoint yarn start
   ```

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

## License

[Apache License](/LICENSE)

Copyright 2020 PingCAP, Inc.
