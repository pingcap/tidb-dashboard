// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package tests

import (
	"testing"

	"github.com/stretchr/testify/suite"
)

func TestStatement(t *testing.T) {
	suite.Run(t, &testStatementSuite{})
}

type testStatementSuite struct {
	suite.Suite
}

func (s *testStatementSuite) SetupSuite() {
}

func (s *testStatementSuite) TearDownSuite() {
}
