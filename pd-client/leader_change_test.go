package pd

import (
	"strings"
	"time"

	. "github.com/pingcap/check"
)

var _ = Suite(&testLeaderChangeSuite{})

type testLeaderChangeSuite struct{}

func (s *testLeaderChangeSuite) TestLeaderChange(c *C) {
	srv1 := newServer(c, 1235, "/pd-leader-change")

	// wait for srv1 to become leader
	time.Sleep(time.Second * 3)

	client, err := NewClient(strings.Split(*testEtcd, ","), "/pd-leader-change", 1)
	c.Assert(err, IsNil)
	defer client.Close()

	p1, l1, err := client.GetTS()
	c.Assert(err, IsNil)

	srv2 := newServer(c, 1236, "/pd-leader-change")
	defer srv2.Close()

	// stop srv1, wait for srv2 to become leader..
	srv1.Close()
	time.Sleep(time.Second * 5)

	p2, l2, err := client.GetTS()
	c.Assert(err, IsNil)
	c.Assert(p1<<8+l1, Less, p2<<8+l2)
}
