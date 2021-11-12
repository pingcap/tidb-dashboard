// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

//go:build distro
// +build distro

package distro

import (
	"github.com/pingcap/tidb-dashboard/pkg/utils/distro"
)

func init() {
	distro.Replace(Resource)
}
