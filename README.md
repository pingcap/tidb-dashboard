# TiDB Dashboard

[![GitHub license](https://img.shields.io/github/license/pingcap/tidb-dashboard?style=flat-square)](https://github.com/pingcap/tidb-dashboard/blob/master/LICENSE)

TiDB Dashboard is a Web UI for monitoring, diagnosing and managing the TiDB cluster.

## Documentation

- [Product User Manual (English)](https://docs.pingcap.com/tidb/stable/dashboard-intro)
- [Product User Manual (Chinese)](https://docs.pingcap.com/zh/tidb/stable/dashboard-intro)
- [FAQ (English)](https://docs.pingcap.com/tidb/stable/dashboard-faq)
- [FAQ (Chinese)](https://docs.pingcap.com/zh/tidb/stable/dashboard-faq)

## Question, Suggestion

Feel free to [open GitHub issues](https://github.com/pingcap/tidb-dashboard/issues/new/choose)
for questions, support and suggestions.

You may also consider to reach out on the [TiDB Internals forum](https://internals.tidb.io/) if you encounter any problems about TiDB development.

For Chinese users, you can visit the PingCAP official user forum [AskTUG.com] to make life easier.

## Getting Started

The most easy way to use TiDB Dashboard with an existing TiDB cluster is to use the one embedded
into [PD]: <http://127.0.0.1:2379/dashboard>. You need PD master branch or 4.0+ version to use
TiDB Dashboard.

Note: The TiDB Dashboard inside PD may be not up to date. To play with latest TiDB Dashboard, build
it from source (see next section).

## Contributing & Developing

Checkout our [help wanted issues](https://github.com/pingcap/tidb-dashboard/issues?q=is%3Aopen+label%3Astatus%2Fhelp-wanted+sort%3Aupdated-desc)
for a list of recommended tasks, in which we have also marked the difficulty level.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for a detailed step-by-step contributing guide, or steps to
build TiDB Dashboard from source.

If you need any help, feel free to reach out on the [TiDB Internals forum](https://internals.tidb.io/).

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
    <td align="center"><a href="https://github.com/ericsyh"><img src="https://avatars3.githubusercontent.com/u/10498732?v=4" width="50px;" alt=""/></a></td>
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

## License

[Apache License](/LICENSE)

Copyright 2020 PingCAP, Inc.

[pd]: https://github.com/pingcap/pd
[asktug.com]: https://asktug.com/

<!-- VERSION_PLACEHOLDER: v8.5.1 -->