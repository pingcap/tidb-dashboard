// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package util

import (
	"os"

	"github.com/Masterminds/semver"
	"github.com/stretchr/testify/require"
)

// IsTiDBVersionLessOrEqual tests if tidb version less or equal input version
// If the tidb version equal to "latest" or "nightly", it always returns false
func CheckTiDBVersion(r *require.Assertions, constraint string) bool {
	tidbVersion := os.Getenv("TIDB_VERSION")
	c, err := semver.NewConstraint(constraint)
	r.NoError(err)
	v, err := semver.NewVersion(tidbVersion)
	r.NoError(err)
	return c.Check(v)
}
