// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package distro

import (
	"sync/atomic"
)

var (
	data            atomic.Value
	defaultResource = map[string]string{
		"tidb":    "TiDB",
		"tikv":    "TiKV",
		"tiflash": "TiFlash",
		"pd":      "PD",
	}
)

func init() {
	Replace(defaultResource)
}

func Resource() map[string]string {
	return data.Load().(map[string]string)
}

func Replace(distro map[string]string) {
	data.Store(distro)
}

func Data(k string) string {
	d := Resource()
	if v, ok := d[k]; ok {
		return v
	}
	return k
}
