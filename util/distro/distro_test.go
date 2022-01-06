// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package distro

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestR(t *testing.T) {
	assert.Equal(t, "TiDB", R().TiDB)
}

func TestReplaceGlobal(t *testing.T) {
	restoreFn := ReplaceGlobal(DistributionResource{
		TiDB: "myTiDB",
		PD:   "",
	})
	assert.Equal(t, false, R().IsDistro)
	assert.Equal(t, "myTiDB", R().TiDB)
	assert.Equal(t, "PD", R().PD)
	assert.Equal(t, "TiKV", R().TiKV)
	restoreFn()
	assert.Equal(t, "TiDB", R().TiDB)
	assert.Equal(t, "PD", R().PD)
	assert.Equal(t, "TiKV", R().TiKV)

	restoreFn = ReplaceGlobal(DistributionResource{
		IsDistro: true,
	})
	assert.Equal(t, true, R().IsDistro)
	assert.Equal(t, "TiDB", R().TiDB)
	assert.Equal(t, "PD", R().PD)
	assert.Equal(t, "TiKV", R().TiKV)
	restoreFn()
}
