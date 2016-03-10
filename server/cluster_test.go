package server

import (
	"net"

	"github.com/coreos/etcd/clientv3"
	"github.com/gogo/protobuf/proto"
	. "github.com/pingcap/check"
	"github.com/pingcap/pd/protopb"
)

var _ = Suite(&testClusterSuite{})

type testClusterSuite struct {
	client *clientv3.Client
	svr    *Server
}

func (s *testClusterSuite) getRootPath() string {
	return "test_cluster"
}

func (s *testClusterSuite) SetUpSuite(c *C) {
	s.svr = newTestServer(c, s.getRootPath())

	s.client = newEtcdClient(c)

	deleteRoot(c, s.client, s.getRootPath())

	go s.svr.Run()
}

func (s *testClusterSuite) TearDownSuite(c *C) {
	s.svr.Close()
	s.client.Close()
}

func (s *testClusterSuite) allocID(c *C) uint64 {
	id, err := s.svr.idAlloc.Alloc()
	c.Assert(err, IsNil)
	return id
}

func newRequestHeader(clusterID uint64) *protopb.RequestHeader {
	return &protopb.RequestHeader{
		ClusterId: proto.Uint64(clusterID),
	}
}

func (s *testClusterSuite) newNode(c *C, nodeID uint64, addr string) *protopb.Node {
	if nodeID == 0 {
		nodeID = s.allocID(c)
	}

	return &protopb.Node{
		NodeId:  proto.Uint64(nodeID),
		Address: proto.String(addr),
	}
}

func (s *testClusterSuite) newStore(c *C, nodeID uint64, storeID uint64) *protopb.Store {
	if storeID == 0 {
		storeID = s.allocID(c)
	}

	c.Assert(nodeID, Greater, uint64(0))
	return &protopb.Store{
		NodeId:  proto.Uint64(nodeID),
		StoreId: proto.Uint64(storeID),
	}
}

func (s *testClusterSuite) newPeer(c *C, nodeID uint64, storeID uint64, peerID uint64) *protopb.Peer {
	c.Assert(nodeID, Greater, uint64(0))
	c.Assert(storeID, Greater, uint64(0))

	if peerID == 0 {
		peerID = s.allocID(c)
	}

	return &protopb.Peer{
		NodeId:  proto.Uint64(nodeID),
		StoreId: proto.Uint64(storeID),
		PeerId:  proto.Uint64(peerID),
	}
}

func (s *testClusterSuite) newRegion(c *C, regionID uint64, startKey []byte, endKey []byte, peers []*protopb.Peer) *protopb.Region {
	if regionID == 0 {
		regionID = s.allocID(c)
	}

	maxPeerID := uint64(0)
	for _, peer := range peers {
		peerID := peer.GetPeerId()
		c.Assert(peerID, Greater, uint64(0))
		if peerID > maxPeerID {
			maxPeerID = peerID
		}
	}

	return &protopb.Region{
		RegionId:  proto.Uint64(regionID),
		StartKey:  startKey,
		EndKey:    endKey,
		Peers:     peers,
		MaxPeerId: proto.Uint64(maxPeerID),
	}
}

func (s *testClusterSuite) TestBootstrap(c *C) {
	leader := mustGetLeader(c, s.client, s.getRootPath())

	conn, err := net.Dial("tcp", leader.GetAddr())
	c.Assert(err, IsNil)
	defer conn.Close()

	clusterID := uint64(0)

	// IsBootstrapped returns false.
	req := &protopb.Request{
		Header:         newRequestHeader(clusterID),
		CmdType:        protopb.CommandType_IsBootstrapped.Enum(),
		IsBootstrapped: &protopb.IsBootstrappedRequest{},
	}

	sendRequest(c, conn, 0, req)
	_, resp := recvResponse(c, conn)
	c.Assert(resp.IsBootstrapped, NotNil)
	c.Assert(resp.IsBootstrapped.GetBootstrapped(), IsFalse)

	// Bootstrap the cluster.
	node := s.newNode(c, 0, "127.0.0.1:20163")
	store := s.newStore(c, node.GetNodeId(), 0)
	peer := s.newPeer(c, node.GetNodeId(), store.GetStoreId(), 0)
	region := s.newRegion(c, 0, []byte{}, []byte{}, []*protopb.Peer{peer})
	req = &protopb.Request{
		Header:  newRequestHeader(clusterID),
		CmdType: protopb.CommandType_Bootstrap.Enum(),
		Bootstrap: &protopb.BootstrapRequest{
			Node:   node,
			Stores: []*protopb.Store{store},
			Region: region,
		},
	}
	sendRequest(c, conn, 0, req)
	_, resp = recvResponse(c, conn)
	c.Assert(resp.Bootstrap, NotNil)

	// IsBootstrapped returns true.
	req = &protopb.Request{
		Header:         newRequestHeader(clusterID),
		CmdType:        protopb.CommandType_IsBootstrapped.Enum(),
		IsBootstrapped: &protopb.IsBootstrappedRequest{},
	}

	sendRequest(c, conn, 0, req)
	_, resp = recvResponse(c, conn)
	c.Assert(resp.IsBootstrapped, NotNil)
	c.Assert(resp.IsBootstrapped.GetBootstrapped(), IsTrue)

	// check bootstrapped error.
	req = &protopb.Request{
		Header:  newRequestHeader(clusterID),
		CmdType: protopb.CommandType_Bootstrap.Enum(),
		Bootstrap: &protopb.BootstrapRequest{
			Node:   node,
			Stores: []*protopb.Store{store},
			Region: region,
		},
	}
	sendRequest(c, conn, 0, req)
	_, resp = recvResponse(c, conn)
	c.Assert(resp.Bootstrap, IsNil)
	c.Assert(resp.Header.Error, NotNil)
	c.Assert(resp.Header.Error.Bootstrapped, NotNil)
}
