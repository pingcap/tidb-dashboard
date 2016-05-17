package server

import (
	. "github.com/pingcap/check"
)

var _ = Suite(&testClusterWorkerSuite{})

type testClusterWorkerSuite struct {
}

func (s *testClusterWorkerSuite) getRootPath() string {
	return "test_cluster_worker"
}

func (s *testClusterWorkerSuite) SetUpSuite(c *C) {
}

func (s *testClusterWorkerSuite) TearDownSuite(c *C) {
}
