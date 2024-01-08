// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package util

import (
	"testing"

	"github.com/shhdgit/testfixtures/v3"
	"github.com/stretchr/testify/require"

	"github.com/pingcap/tidb-dashboard/util/testutil"
)

func LoadFixtures(t *testing.T, testDB *testutil.TestDB, dir string) {
	r := require.New(t)

	db, err := testDB.Gorm().DB()
	r.NoError(err)

	fixtures, err := testfixtures.New(
		testfixtures.Database(db),
		testfixtures.Dialect("tidb"),
		testfixtures.Directory(dir),
	)
	r.NoError(err)

	err = fixtures.Load()
	r.NoError(err)
}
