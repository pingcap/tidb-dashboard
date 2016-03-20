package pd

import (
	"flag"
	"fmt"
	"strings"
	"testing"
	"time"

	. "github.com/pingcap/check"
	"github.com/pingcap/pd/server"
)

func TestClient(t *testing.T) {
	TestingT(t)
}

var (
	testEtcd = flag.String("etcd", "127.0.0.1:2378", "Etcd gPRC endpoints, separated by comma")
)

var _ = Suite(&testClientSuite{})

type testClientSuite struct {
}

func newServer(c *C, port int) *server.Server {
	cfg := &server.Config{
		Addr:        fmt.Sprintf("127.0.0.1:%d", port),
		EtcdAddrs:   strings.Split(*testEtcd, ","),
		RootPath:    "/pd",
		LeaderLease: 1,
	}
	s, err := server.NewServer(cfg)
	c.Assert(err, IsNil)

	go s.Run()
	return s
}

func (s *testClientSuite) TestTSO(c *C) {
	srv := newServer(c, 1234)
	defer srv.Close()

	// wait for srv to become leader
	time.Sleep(time.Second)

	client, err := NewClient(strings.Split(*testEtcd, ","), "/pd/leader", 1)
	c.Assert(err, IsNil)
	defer client.Close()

	var tss []int64
	for i := 0; i < 100; i++ {
		p, l, err := client.GetTS()
		c.Assert(err, IsNil)
		tss = append(tss, p<<18+l)
	}

	var last int64
	for _, ts := range tss {
		c.Assert(ts, Greater, last)
		last = ts
	}
}

func (s *testClientSuite) TestTSOSwitchLeader(c *C) {
	srv1 := newServer(c, 1235)

	// wait for srv1 to become leader
	time.Sleep(time.Second * 5)

	client, err := NewClient(strings.Split(*testEtcd, ","), "/pd/leader", 1)
	c.Assert(err, IsNil)
	defer client.Close()

	p1, l1, err := client.GetTS()
	c.Assert(err, IsNil)

	srv2 := newServer(c, 1236)
	defer srv2.Close()

	// stop srv1, wait for srv2 to become leader..
	srv1.Close()
	time.Sleep(time.Second * 5)

	p2, l2, err := client.GetTS()
	c.Assert(err, IsNil)
	c.Assert(p1<<8+l1, Less, p2<<8+l2)

}

func (s *testClientSuite) TestRegion(c *C) {
	// TODO
}
