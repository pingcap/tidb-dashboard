// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

//go:build !ui_server
// +build !ui_server

package uiserver

import (
	"net/http"

	"github.com/pingcap/tidb-dashboard/pkg/config"
)

func Assets(*config.Config) http.FileSystem {
	return nil
}
