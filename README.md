# TiDB Dashboard

[![GitHub license](https://img.shields.io/github/license/pingcap-incubator/tidb-dashboard?style=flat-square)](https://github.com/pingcap-incubator/tidb-dashboard/blob/master/LICENSE)

TiDB Dashboard is a Web UI for monitoring, diagnosing and managing the TiDB cluster.

## Documentation

- [Product User Manual (Chinese)](https://pingcap.com/docs-cn/stable/dashboard/dashboard-intro/)
- [FAQ (Chinese)](https://pingcap.com/docs-cn/stable/dashboard/dashboard-faq/)

## Question, Suggestion

Feel free to [open GitHub issues](https://github.com/pingcap-incubator/tidb-dashboard/issues/new/choose)
for questions, support and suggestions.

You may also consider join our community chat in the Slack channel [#sig-dashboard].

For Chinese users, you can visit the PingCAP official user forum [AskTUG.com] to make life easier.

## Getting Started

The most easy way to use TiDB Dashboard with an existing TiDB cluster is to use the one embedded
into [PD]: <http://127.0.0.1:2379/dashboard>. You need PD master branch or 4.0+ version to use
TiDB Dashboard.

Note: The TiDB Dashboard inside PD may be not up to date. To play with latest TiDB Dashboard, build
it from source (see next section).

## Contributing & Developing

Checkout our [help wanted issues](https://github.com/pingcap-incubator/tidb-dashboard/issues?q=is%3Aopen+label%3Astatus%2Fhelp-wanted+sort%3Aupdated-desc)
for a list of recommended tasks, in which we have also marked the difficulty level.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for a detailed step-by-step contributing guide, or steps to
build TiDB Dashboard from source.

If you need any help, feel free to community chat in the Slack channel [#sig-dashboard].

Thank you to all the people who already contributed to TiDB Dashboard!

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://github.com/Fullstop000"><img src="https://avatars1.githubusercontent.com/u/12471960?v=4" width="50px;" alt=""/></a></td>
    <td align="center"><a href="http://rleungx.github.io"><img src="https://avatars3.githubusercontent.com/u/35896542?v=4" width="50px;" alt=""/></a></td>
    <td align="center"><a href="https://github.com/zzh-wisdom"><img src="https://avatars2.githubusercontent.com/u/52516344?v=4" width="50px;" alt=""/></a></td>
    <td align="center"><a href="https://github.com/STRRL"><img src="https://avatars0.githubusercontent.com/u/20221408?v=4" width="50px;" alt=""/></a></td>
    <td align="center"><a href="https://github.com/SSebo"><img src="https://avatars0.githubusercontent.com/u/5784607?v=4" width="50px;" alt=""/></a></td>
    <td align="center"><a href="https://yisaer.github.io/"><img src="https://avatars1.githubusercontent.com/u/13427348?v=4" width="50px;" alt=""/></a></td>
    <td align="center"><a href="https://github.com/gauss1314"><img src="https://avatars2.githubusercontent.com/u/3862518?v=4" width="50px;" alt=""/></a></td>
    <td align="center"><a href="https://github.com/leiysky"><img src="https://avatars2.githubusercontent.com/u/22445410?v=4" width="50px;" alt=""/></a></td>
    <td align="center"><a href="https://github.com/niedhui"><img src="https://avatars0.githubusercontent.com/u/66329?v=4" width="50px;" alt=""/></a></td>
    <td align="center"><a href="https://weihanglo.tw/"><img src="https://avatars2.githubusercontent.com/u/14314532?v=4" width="50px;" alt=""/></a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://github.com/yikeke"><img src="https://avatars1.githubusercontent.com/u/40977455?v=4" width="50px;" alt=""/></a></td>
    <td align="center"><a href="https://github.com/qxhy123"><img src="https://avatars2.githubusercontent.com/u/518969?v=4" width="50px;" alt=""/></a></td>
    <td align="center"><a href="http://www.rustin.cn"><img src="https://avatars0.githubusercontent.com/u/29879298?v=4" width="50px;" alt=""/></a></td>
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

By default, the base URL of Dashboard API is `http://127.0.0.1:12333` if using `yarn start` to set
up the dashboard for development. Sometimes you just want to change the URL for some reasons:

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

## License

[Apache License](/LICENSE)

Copyright 2020 PingCAP, Inc.

[pd]: https://github.com/pingcap/pd
[#sig-dashboard]: https://slack.tidb.io/invite?team=tidb-community&channel=sig-dashboard&ref=github_dashboard_repo
[asktug.com]: https://asktug.com/
