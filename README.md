# TiDB Dashboard

TiDB Dashboard is a GUI interface to control a TiDB cluster via PD HTTP APIs. TiDB Dashboard can be integrated into PD, as follows:

![](etc/arch_overview.svg)

This repository contains both Dashboard HTTP API and Dashboard UI. Dashboard HTTP API is placed in `pkg/` directory, written in Golang. Dashboard UI is placed in `ui/` directory, powered by React.

TiDB Dashboard can also live as a standalone binary for development.

## Getting Started

### Requirements

- Required: Go 1.13+
- Optional: [Node.js](https://nodejs.org/) 12+ and [yarn](https://yarnpkg.com/) if you want to build
  the UI.

### Build Standalone Dashboard Server

**NOTE**: Dashboard Server can be integrated into [pd](https://github.com/pingcap/pd), as well as compiled
into a standalone binary. The following steps describes how to build **the standalone TiDB Dashboard binary**.

Standalone Dashboard Server contains the following components:

- Core Dashboard API server
- Swagger API explorer UI (optional)
- Dashboard UI server (optional)

#### Minimal Build: API Only

![](etc/arch_dashboard_api_only.svg)

To build a dashboard server that only serves Dashboard API:

```sh
make server
# make run
```


#### API + Swagger API UI

To build a dashboard server that serves both API and the Swagger API UI:

```sh
make # or more verbose: SWAGGER=1 make server
# make run
```

You can visit the Swagger API UI via http://127.0.0.1:12333/api/swagger.

#### Full Featured Build: API + Swagger API UI + Dashboard UI

![](etc/arch_dashboard_standalone.svg)

Note: You need Node.js and yarn installed in order to build a full-featured dashboard server. See
Requirements section for details.

To install the packages from GitHub Packages, you need to config the `~/.npmrc` to set the auth token for GitHub registry, see README from [pd-client-js](https://github.com/pingcap-incubator/pd-client-js#install) for details.

```sh
make ui  # Build UI from source
SWAGGER=1 UI=1 make server
# make run
```

This will build a production-ready Dashboard server, which includes everything in a single binary.
You can omit the `make ui` step if the UI part is unchanged.

You can visit the Dashboard UI via http://127.0.0.1:12333.

## PD Integration

![](etc/arch_pd_integration.svg)

TODO

## Development

### For Dashboard UI Developer

![](etc/arch_dashboard_ui_server.svg)

If you want to develop Dashboard UI, the recommended workflow is as follows:

1. Build Dashboard API Client

   Dashboard API Client is auto-generated from the Swagger spec, which is auto-generated from
   the Golang code. These code is not included in the repository. Thus, if you build UI for the
   first time (or backend interface has been changed), you need to build or rebuild the API client:

   ```bash
   make swagger_client
   ```

   The command above internally generates the Swagger spec first and then generates the Dashboard
   API client.

2. Build and Run Dashboard API Server

   Please refer to the Build Standalone Dashboard Server section. You must keep the Dashboard API backend
   server running for UI to work.

3. Start React Development Server

   ```sh
   cd ui
   npm start
   ```

   By default, the development UI will connect to local Dashboard API service at
   http://127.0.0.1:12333. Alternatively you can change the behaviour by specifying env variables:

   ```sh
   REACT_APP_DASHBOARD_API_URL=http://127.0.0.1:23456 npm start
   ```

   Currently the development server will not watch for Golang code changes, which means you must
   manually rebuild the Dashboard API Client if back-end code is updated (for example, you pulled
   latest change from the repository).

### For Dashboard Backend Developer

Since Dashboard is imported into PD as a GitHub module directly, it may not be very convenient if
you frequently change the Dashboard backend implementation and rebuild the PD after each change.
The recommended workflow is to build a standalone Dashboard binary as follows:

TODO

### For PD Developer

TODO
