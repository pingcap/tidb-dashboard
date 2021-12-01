// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package tests

import (
	"testing"

	"github.com/stretchr/testify/suite"
)

func TestSlowQuery(t *testing.T) {
	suite.Run(t, &testSlowQuerySuite{})
}

type testSlowQuerySuite struct {
	suite.Suite
}

func (s *testSlowQuerySuite) SetupSuite() {}

func (s *testSlowQuerySuite) TearDownSuite() {}
