package server

import (
	"path"
	"sync"

	"github.com/coreos/etcd/clientv3"
	. "github.com/pingcap/check"
)

var _ = Suite(&testAllocIDSuite{})

type testAllocIDSuite struct {
	client *clientv3.Client
	alloc  *idAllocator
}

func (s *testAllocIDSuite) getRootPath() string {
	return "test_alloc_id"
}

func (s *testAllocIDSuite) SetUpSuite(c *C) {
	s.client = newEtcdClient(c)

	s.alloc = newIDAllocator(s.client, path.Join(s.getRootPath(), "test_id"))

	deleteRoot(c, s.client, s.getRootPath())
}

func (s *testAllocIDSuite) TearDownSuite(c *C) {
	s.client.Close()
}

func (s *testAllocIDSuite) TestID(c *C) {
	for i := uint64(0); i < allocStep; i++ {
		id, err := s.alloc.Alloc()
		c.Assert(err, IsNil)
		c.Assert(id, Equals, uint64(i+1))
	}

	var wg sync.WaitGroup

	var m sync.Mutex
	ids := make(map[uint64]struct{})

	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()

			for i := 0; i < 200; i++ {
				id, err := s.alloc.Alloc()
				c.Assert(err, IsNil)
				m.Lock()
				_, ok := ids[id]
				ids[id] = struct{}{}
				m.Unlock()
				c.Assert(ok, IsFalse)
			}
		}()
	}

	wg.Wait()
}
