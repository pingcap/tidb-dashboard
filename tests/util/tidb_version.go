// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package util

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/pingcap/tidb-dashboard/util/testutil"
)

func GetTiDBVersion(t *testing.T, testDB *testutil.TestDB) string {
	r := require.New(t)

	// get tidb version
	type versionSchemas struct {
		Version string `gorm:"column:version"`
	}
	var result []versionSchemas
	err := testDB.Gorm().Raw("select version() as version").Scan(&result).Error
	// output example:
	// +--------------------+
	// | version            |
	// +--------------------+
	// | 5.7.25-TiDB-v5.3.0 |
	// +--------------------+
	r.Nil(err)
	r.Len(result, 1)
	ver := strings.Split(result[0].Version, "-TiDB-")
	r.Len(ver, 2)
	return ver[1]
}
