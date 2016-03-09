package server

import (
	"flag"
	"strings"
	"testing"
	"time"

	"golang.org/x/net/context"

	"github.com/coreos/etcd/clientv3"
	. "github.com/pingcap/check"
)

func TestServer(t *testing.T) {
	TestingT(t)
}

var (
	test_etcd = flag.String("etcd", "127.0.0.1:2378", "Etcd gPRC endpoints, separated by comma")
)

func newTestServer(c *C, rootPath string) *Server {
	cfg := &Config{
		Addr:            "127.0.0.1:0",
		EtcdAddrs:       strings.Split(*test_etcd, ","),
		RootPath:        rootPath,
		LeaderLease:     1,
		TsoSaveInterval: 500,
	}

	svr, err := NewServer(cfg)
	c.Assert(err, IsNil)

	// We use 127.0.0.1:0, here force reset real listening addr
	// in configuration.
	svr.cfg.Addr = svr.ListeningAddr()

	return svr
}

func newEtcdClient(c *C) *clientv3.Client {
	client, err := clientv3.New(clientv3.Config{
		Endpoints:   strings.Split(*test_etcd, ","),
		DialTimeout: time.Second,
	})

	c.Assert(err, IsNil)
	return client
}

func deleteRoot(c *C, client *clientv3.Client, rootPath string) {
	kv := clientv3.NewKV(client)

	_, err := kv.Delete(context.TODO(), rootPath+"/", clientv3.WithPrefix())
	c.Assert(err, IsNil)

	_, err = kv.Delete(context.TODO(), rootPath)
	c.Assert(err, IsNil)
}

var _ = Suite(&testLeaderServerSuite{})

type testLeaderServerSuite struct {
	client *clientv3.Client
	svrs   map[string]*Server
}

func (s *testLeaderServerSuite) getRootPath() string {
	return "test_leader"
}

func (s *testLeaderServerSuite) SetUpSuite(c *C) {
	s.svrs = make(map[string]*Server)

	for i := 0; i < 3; i++ {
		svr := newTestServer(c, s.getRootPath())
		s.svrs[svr.cfg.Addr] = svr
	}

	s.client = newEtcdClient(c)

	deleteRoot(c, s.client, s.getRootPath())
}

func (s *testLeaderServerSuite) TearDownSuite(c *C) {
	for _, svr := range s.svrs {
		svr.Close()
	}
	s.client.Close()
}

func (s *testLeaderServerSuite) TestLeader(c *C) {
	for _, svr := range s.svrs {
		go svr.Run()
	}

	for i := 0; i < 100 && len(s.svrs) > 0; i++ {
		leader, err := GetLeader(s.client, GetLeaderPath(s.getRootPath()))
		c.Assert(err, IsNil)

		if leader == nil {
			time.Sleep(time.Second)
			continue
		}

		// The leader key is not expired, retry again.
		svr, ok := s.svrs[leader.GetAddr()]
		if !ok {
			time.Sleep(time.Second)
			continue
		}

		delete(s.svrs, leader.GetAddr())
		svr.Close()

		time.Sleep(time.Second)
	}

	c.Assert(s.svrs, HasLen, 0)
}
