package server

import (
	"encoding/binary"
	"io"
	"math/rand"
	"net"
	"sync"

	"github.com/coreos/etcd/clientv3"
	"github.com/golang/protobuf/proto"
	. "github.com/pingcap/check"
	"github.com/pingcap/pd/protopb"
)

var _ = Suite(&testTsoSuite{})

type testTsoSuite struct {
	client *clientv3.Client
	svr    *Server
}

func (s *testTsoSuite) getRootPath() string {
	return "test_tso"
}

func (s *testTsoSuite) SetUpSuite(c *C) {
	s.svr = newTestServer(c, s.getRootPath())

	s.client = newEtcdClient(c)

	deleteRoot(c, s.client, s.getRootPath())

	go s.svr.Run()
}

func (s *testTsoSuite) TearDownSuite(c *C) {
	s.svr.Close()
	s.client.Close()
}

func sendRequest(c *C, conn net.Conn, msgID uint64, request *protopb.Request) {
	body, err := proto.Marshal(request)
	c.Assert(err, IsNil)

	header := make([]byte, msgHeaderSize)

	binary.BigEndian.PutUint16(header[0:2], msgMagic)
	binary.BigEndian.PutUint16(header[2:4], msgVersion)
	binary.BigEndian.PutUint32(header[4:8], uint32(len(body)))
	binary.BigEndian.PutUint64(header[8:16], msgID)

	_, err = conn.Write(header)
	c.Assert(err, IsNil)

	_, err = conn.Write(body)
	c.Assert(err, IsNil)
}

func recvResponse(c *C, conn net.Conn) (uint64, *protopb.Response) {
	header := make([]byte, msgHeaderSize)
	_, err := io.ReadFull(conn, header)
	c.Assert(err, IsNil)
	c.Assert(binary.BigEndian.Uint16(header[0:2]), Equals, msgMagic)

	msgLen := binary.BigEndian.Uint32(header[4:8])
	msgID := binary.BigEndian.Uint64(header[8:])

	body := make([]byte, msgLen)
	_, err = io.ReadFull(conn, body)
	c.Assert(err, IsNil)

	resp := &protopb.Response{}
	err = proto.Unmarshal(body, resp)
	c.Assert(err, IsNil)

	return msgID, resp
}

func (s *testTsoSuite) testGetTimestamp(c *C, conn net.Conn, n int) {
	tso := &protopb.TsoRequest{
		Number: proto.Uint32(uint32(n)),
	}

	req := &protopb.Request{
		CmdType: protopb.CommandType_Tso.Enum(),
		Tso:     tso,
	}

	msgID := uint64(rand.Int63())
	sendRequest(c, conn, msgID, req)
	msgID, resp := recvResponse(c, conn)
	c.Assert(msgID, Equals, msgID)
	c.Assert(resp.Tso, NotNil)
	c.Assert(len(resp.Tso.Timestamps), Equals, n)

	res := resp.Tso.Timestamps
	last := protopb.Timestamp{}
	for i := 0; i < n; i++ {
		c.Assert(res[i].GetPhysical(), GreaterEqual, last.GetPhysical())
		if res[i].GetPhysical() == last.GetPhysical() {
			c.Assert(res[i].GetLogical(), Greater, last.GetLogical())
		}

		last = *res[i]
	}
}

func (s *testTsoSuite) TestTso(c *C) {
	for {
		leader, err := GetLeader(s.client, GetLeaderPath(s.getRootPath()))
		c.Assert(err, IsNil)
		if leader != nil {
			break
		}
	}

	var wg sync.WaitGroup
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()

			conn, err := net.Dial("tcp", s.svr.ListeningAddr())
			c.Assert(err, IsNil)
			defer conn.Close()

			s.testGetTimestamp(c, conn, 10)
		}()
	}

	wg.Wait()
}
