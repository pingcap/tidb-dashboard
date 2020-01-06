# TiDB Dashboard

TiDB Dashboard is a GUI interface to control a TiDB cluster via PD HTTP APIs.

This repository contains both back-end service implementation in `pkg/` directory and front-end
implementation in `ui/` directory.

## Architecture

TiDB Dashboard back-end is provided as a Golang package, imported directly by PD. TiDB Dashboard front-end can be compiled into a React web app and being served by a simple HTTP
server. See `ui/` directory for details.

## Getting Started

### Requirements

- Required: Go 1.13+
- Optional: [Node.js](https://nodejs.org/) 12+ and [yarn](https://yarnpkg.com/) if you want to build
  the UI.

### Build Dashboard Server

Dashboard Server can be integrated into [pd](https://github.com/pingcap/pd), as well as compiled
into a standalone binary. The following steps describes how to build the standalone TiDB Dashboard binary.

Standalone Dashboard Server contains the following components:

- Core Dashboard API server
- Swagger API explorer UI (optional)
- Dashboard UI server (optional)

#### Minimal Build: API Only

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

Note: You need Node.js and yarn installed in order to build a full-featured dashboard server. See
Requirements section for details.

```sh
make ui  # Build UI from source
SWAGGER=1 UI=1 make server
# make run
```

This will build a production-ready Dashboard server, which includes everything in a single binary.
You can omit the `make ui` step if the UI part is unchanged.

You can visit the Dashboard UI via http://127.0.0.1:12333.

### UI Development

For front-end developers, the recommended workflow is as follows:

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

   Please refer to the Build Dashboard Server section. You must keep the Dashboard API backend
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

## PD Integration

TODO
