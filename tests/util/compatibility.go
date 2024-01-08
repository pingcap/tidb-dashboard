// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package util

import (
	"os"

	"github.com/Masterminds/semver"
	"github.com/stretchr/testify/require"
)

// CheckTiDBVersion tests if tidb version satisfies the constraints.
// Constraint examples: "~5.2.2", ">= 5.3.0", see github.com/Masterminds/semver to get more information.
func CheckTiDBVersion(r *require.Assertions, constraint string) bool {
	tidbVersion := os.Getenv("TIDB_VERSION")
	if tidbVersion == "" {
		return false
	}
	c, err := semver.NewConstraint(constraint)
	r.NoError(err)
	v, err := semver.NewVersion(tidbVersion)
	r.NoError(err)
	return c.Check(v)
}
