# TiDB Dashboard

TiDB Dashboard is a GUI interface to control a TiDB cluster via PD HTTP APIs.

This repository contains both back-end service implementation in `pkg/` directory and front-end
implementation in `ui/` directory.

## Architecture

### Back-end

TiDB Dashboard back-end is provided as a Golang package, imported directly by PD.

### Front-end

TiDB Dashboard front-end can be compiled into a React web app and being served by a simple HTTP
server. See `ui/` director for details.

## Getting Started

TODO
