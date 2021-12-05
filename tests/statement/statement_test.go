// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package tests

import (
	"testing"

	"github.com/stretchr/testify/suite"
)

func TestStatement(t *testing.T) {
	suite.Run(t, &testStatementSuite{
		tableName: "INFORMATION_SCHEMA.CLUSTER_STATEMENTS_SUMMARY_HISTORY",
	})
}

type testStatementSuite struct {
	suite.Suite
	tableName string
}

func (s *testStatementSuite) SetupSuite() {
}

func (s *testStatementSuite) TearDownSuite() {
}
