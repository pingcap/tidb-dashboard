package server

import (
	"net"

	"github.com/coreos/etcd/clientv3"
	"github.com/golang/protobuf/proto"
	. "github.com/pingcap/check"
	"github.com/pingcap/kvproto/pkg/metapb"
	"github.com/pingcap/kvproto/pkg/pdpb"
)

const (
	initEpochVersion uint64 = 1
	initEpochConfVer uint64 = 1
)

var _ = Suite(&testClusterSuite{})

type testClusterBaseSuite struct {
	client *clientv3.Client
	svr    *Server
}

type testClusterSuite struct {
	testClusterBaseSuite
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

func (s *testClusterBaseSuite) allocID(c *C) uint64 {
	id, err := s.svr.idAlloc.Alloc()
	c.Assert(err, IsNil)
	return id
}

func newRequestHeader(clusterID uint64) *pdpb.RequestHeader {
	return &pdpb.RequestHeader{
		ClusterId: proto.Uint64(clusterID),
	}
}

func (s *testClusterBaseSuite) newNode(c *C, nodeID uint64, addr string) *metapb.Node {
	if nodeID == 0 {
		nodeID = s.allocID(c)
	}

	return &metapb.Node{
		NodeId:  proto.Uint64(nodeID),
		Address: proto.String(addr),
	}
}

func (s *testClusterBaseSuite) newStore(c *C, nodeID uint64, storeID uint64) *metapb.Store {
	if storeID == 0 {
		storeID = s.allocID(c)
	}

	c.Assert(nodeID, Greater, uint64(0))
	return &metapb.Store{
		NodeId:  proto.Uint64(nodeID),
		StoreId: proto.Uint64(storeID),
	}
}

func (s *testClusterBaseSuite) newPeer(c *C, nodeID uint64, storeID uint64, peerID uint64) *metapb.Peer {
	c.Assert(nodeID, Greater, uint64(0))
	c.Assert(storeID, Greater, uint64(0))

	if peerID == 0 {
		peerID = s.allocID(c)
	}

	return &metapb.Peer{
		NodeId:  proto.Uint64(nodeID),
		StoreId: proto.Uint64(storeID),
		PeerId:  proto.Uint64(peerID),
	}
}

func (s *testClusterBaseSuite) newRegion(c *C, regionID uint64, startKey []byte,
	endKey []byte, peers []*metapb.Peer, epoch *metapb.RegionEpoch) *metapb.Region {
	if regionID == 0 {
		regionID = s.allocID(c)
	}

	if epoch == nil {
		epoch = &metapb.RegionEpoch{
			ConfVer: proto.Uint64(initEpochConfVer),
			Version: proto.Uint64(initEpochVersion),
		}
	}

	for _, peer := range peers {
		peerID := peer.GetPeerId()
		c.Assert(peerID, Greater, uint64(0))
	}

	return &metapb.Region{
		RegionId:    proto.Uint64(regionID),
		StartKey:    startKey,
		EndKey:      endKey,
		Peers:       peers,
		RegionEpoch: epoch,
	}
}

func (s *testClusterSuite) TestBootstrap(c *C) {
	leader := mustGetLeader(c, s.client, s.getRootPath())

	conn, err := net.Dial("tcp", leader.GetAddr())
	c.Assert(err, IsNil)
	defer conn.Close()

	clusterID := uint64(0)

	// IsBootstrapped returns false.
	req := &pdpb.Request{
		Header:         newRequestHeader(clusterID),
		CmdType:        pdpb.CommandType_IsBootstrapped.Enum(),
		IsBootstrapped: &pdpb.IsBootstrappedRequest{},
	}

	sendRequest(c, conn, 0, req)
	_, resp := recvResponse(c, conn)
	c.Assert(resp.IsBootstrapped, NotNil)
	c.Assert(resp.IsBootstrapped.GetBootstrapped(), IsFalse)

	// Bootstrap the cluster.
	node := s.newNode(c, 0, "127.0.0.1:20163")
	store := s.newStore(c, node.GetNodeId(), 0)
	peer := s.newPeer(c, node.GetNodeId(), store.GetStoreId(), 0)
	region := s.newRegion(c, 0, []byte{}, []byte{}, []*metapb.Peer{peer}, nil)
	req = &pdpb.Request{
		Header:  newRequestHeader(clusterID),
		CmdType: pdpb.CommandType_Bootstrap.Enum(),
		Bootstrap: &pdpb.BootstrapRequest{
			Node:   node,
			Stores: []*metapb.Store{store},
			Region: region,
		},
	}
	sendRequest(c, conn, 0, req)
	_, resp = recvResponse(c, conn)
	c.Assert(resp.Bootstrap, NotNil)

	// IsBootstrapped returns true.
	req = &pdpb.Request{
		Header:         newRequestHeader(clusterID),
		CmdType:        pdpb.CommandType_IsBootstrapped.Enum(),
		IsBootstrapped: &pdpb.IsBootstrappedRequest{},
	}

	sendRequest(c, conn, 0, req)
	_, resp = recvResponse(c, conn)
	c.Assert(resp.IsBootstrapped, NotNil)
	c.Assert(resp.IsBootstrapped.GetBootstrapped(), IsTrue)

	// check bootstrapped error.
	req = &pdpb.Request{
		Header:  newRequestHeader(clusterID),
		CmdType: pdpb.CommandType_Bootstrap.Enum(),
		Bootstrap: &pdpb.BootstrapRequest{
			Node:   node,
			Stores: []*metapb.Store{store},
			Region: region,
		},
	}
	sendRequest(c, conn, 0, req)
	_, resp = recvResponse(c, conn)
	c.Assert(resp.Bootstrap, IsNil)
	c.Assert(resp.Header.Error, NotNil)
	c.Assert(resp.Header.Error.Bootstrapped, NotNil)
}

func (s *testClusterBaseSuite) newBootstrapRequest(c *C, clusterID uint64, nodeAddr string) *pdpb.Request {
	node := s.newNode(c, 0, nodeAddr)
	store := s.newStore(c, node.GetNodeId(), 0)
	peer := s.newPeer(c, node.GetNodeId(), store.GetStoreId(), 0)
	region := s.newRegion(c, 0, []byte{}, []byte{}, []*metapb.Peer{peer}, nil)

	req := &pdpb.Request{
		Header:  newRequestHeader(clusterID),
		CmdType: pdpb.CommandType_Bootstrap.Enum(),
		Bootstrap: &pdpb.BootstrapRequest{
			Node:   node,
			Stores: []*metapb.Store{store},
			Region: region,
		},
	}
	return req
}

// helper function to check and bootstrap
func (s *testClusterBaseSuite) bootstrapCluster(c *C, conn net.Conn, clusterID uint64, nodeAddr string) {
	req := s.newBootstrapRequest(c, clusterID, nodeAddr)
	sendRequest(c, conn, 0, req)
	_, resp := recvResponse(c, conn)
	c.Assert(resp.Bootstrap, NotNil)
}

func (s *testClusterBaseSuite) getNode(c *C, conn net.Conn, clusterID uint64, nodeID uint64) *metapb.Node {
	req := &pdpb.Request{
		Header:  newRequestHeader(clusterID),
		CmdType: pdpb.CommandType_GetMeta.Enum(),
		GetMeta: &pdpb.GetMetaRequest{
			MetaType: pdpb.MetaType_NodeType.Enum(),
			NodeId:   proto.Uint64(nodeID),
		},
	}
	sendRequest(c, conn, 0, req)
	_, resp := recvResponse(c, conn)
	c.Assert(resp.GetMeta, NotNil)
	c.Assert(resp.GetMeta.GetMetaType(), Equals, pdpb.MetaType_NodeType)
	c.Assert(resp.GetMeta.GetNode().GetNodeId(), Equals, uint64(nodeID))

	return resp.GetMeta.GetNode()
}

func (s *testClusterBaseSuite) getStore(c *C, conn net.Conn, clusterID uint64, storeID uint64) *metapb.Store {
	req := &pdpb.Request{
		Header:  newRequestHeader(clusterID),
		CmdType: pdpb.CommandType_GetMeta.Enum(),
		GetMeta: &pdpb.GetMetaRequest{
			MetaType: pdpb.MetaType_StoreType.Enum(),
			StoreId:  proto.Uint64(storeID),
		},
	}
	sendRequest(c, conn, 0, req)
	_, resp := recvResponse(c, conn)
	c.Assert(resp.GetMeta, NotNil)
	c.Assert(resp.GetMeta.GetMetaType(), Equals, pdpb.MetaType_StoreType)
	c.Assert(resp.GetMeta.GetStore().GetStoreId(), Equals, uint64(storeID))
	return resp.GetMeta.GetStore()
}

func (s *testClusterBaseSuite) getRegion(c *C, conn net.Conn, clusterID uint64, regionKey []byte) *metapb.Region {
	req := &pdpb.Request{
		Header:  newRequestHeader(clusterID),
		CmdType: pdpb.CommandType_GetMeta.Enum(),
		GetMeta: &pdpb.GetMetaRequest{
			MetaType:  pdpb.MetaType_RegionType.Enum(),
			RegionKey: regionKey,
		},
	}
	sendRequest(c, conn, 0, req)
	_, resp := recvResponse(c, conn)
	c.Assert(resp.GetMeta, NotNil)
	c.Assert(resp.GetMeta.GetMetaType(), Equals, pdpb.MetaType_RegionType)
	c.Assert(resp.GetMeta.GetRegion(), NotNil)

	return resp.GetMeta.GetRegion()
}

func (s *testClusterBaseSuite) getMeta(c *C, conn net.Conn, clusterID uint64) *metapb.Cluster {
	req := &pdpb.Request{
		Header:  newRequestHeader(clusterID),
		CmdType: pdpb.CommandType_GetMeta.Enum(),
		GetMeta: &pdpb.GetMetaRequest{
			MetaType:  pdpb.MetaType_ClusterType.Enum(),
			ClusterId: proto.Uint64(clusterID),
		},
	}

	sendRequest(c, conn, 0, req)
	_, resp := recvResponse(c, conn)
	c.Assert(resp.GetMeta, NotNil)
	c.Assert(resp.GetMeta.GetMetaType(), Equals, pdpb.MetaType_ClusterType)
	c.Assert(resp.GetMeta.GetCluster(), NotNil)

	return resp.GetMeta.GetCluster()
}

func (s *testClusterSuite) TestGetPutMeta(c *C) {
	leader := mustGetLeader(c, s.client, s.getRootPath())

	conn, err := net.Dial("tcp", leader.GetAddr())
	c.Assert(err, IsNil)
	defer conn.Close()

	clusterID := uint64(1)

	nodeAddr := "127.0.0.1:0"
	s.bootstrapCluster(c, conn, clusterID, nodeAddr)

	// Get region
	region := s.getRegion(c, conn, clusterID, []byte("abc"))
	c.Assert(region.GetPeers(), HasLen, 1)
	peer := region.GetPeers()[0]

	// Get node
	nodeID := peer.GetNodeId()
	node := s.getNode(c, conn, clusterID, nodeID)
	c.Assert(node.GetAddress(), Equals, nodeAddr)

	// Get store
	storeID := peer.GetStoreId()
	store := s.getStore(c, conn, clusterID, storeID)
	c.Assert(store.GetNodeId(), Equals, uint64(nodeID))

	// Update node
	nodeAddr = "127.0.0.1:1"
	req := &pdpb.Request{
		Header:  newRequestHeader(clusterID),
		CmdType: pdpb.CommandType_PutMeta.Enum(),
		PutMeta: &pdpb.PutMetaRequest{
			MetaType: pdpb.MetaType_NodeType.Enum(),
			Node:     s.newNode(c, nodeID, nodeAddr),
		},
	}
	sendRequest(c, conn, 0, req)
	_, resp := recvResponse(c, conn)
	c.Assert(resp.PutMeta, NotNil)
	c.Assert(resp.PutMeta.GetMetaType(), Equals, pdpb.MetaType_NodeType)

	node = s.getNode(c, conn, clusterID, nodeID)
	c.Assert(node.GetAddress(), Equals, nodeAddr)

	// Add another store
	req = &pdpb.Request{
		Header:  newRequestHeader(clusterID),
		CmdType: pdpb.CommandType_PutMeta.Enum(),
		PutMeta: &pdpb.PutMetaRequest{
			MetaType: pdpb.MetaType_StoreType.Enum(),
			Store:    s.newStore(c, nodeID, 0),
		},
	}
	storeID = req.PutMeta.Store.GetStoreId()
	sendRequest(c, conn, 0, req)
	_, resp = recvResponse(c, conn)
	c.Assert(resp.PutMeta, NotNil)
	c.Assert(resp.PutMeta.GetMetaType(), Equals, pdpb.MetaType_StoreType)
	store = s.getStore(c, conn, clusterID, storeID)
	c.Assert(store.GetNodeId(), Equals, uint64(nodeID))

	// Add a new store but we don't add node before, must error
	nodeID = s.allocID(c)
	req = &pdpb.Request{
		Header:  newRequestHeader(clusterID),
		CmdType: pdpb.CommandType_PutMeta.Enum(),
		PutMeta: &pdpb.PutMetaRequest{
			MetaType: pdpb.MetaType_StoreType.Enum(),
			Store:    s.newStore(c, nodeID, 0),
		},
	}
	sendRequest(c, conn, 0, req)
	_, resp = recvResponse(c, conn)
	c.Assert(resp.PutMeta, IsNil)
	c.Assert(resp.Header.GetError(), NotNil)

	// update cluster meta
	req = &pdpb.Request{
		Header:  newRequestHeader(clusterID),
		CmdType: pdpb.CommandType_PutMeta.Enum(),
		PutMeta: &pdpb.PutMetaRequest{
			MetaType: pdpb.MetaType_ClusterType.Enum(),
			Cluster: &metapb.Cluster{
				ClusterId:     proto.Uint64(clusterID),
				MaxPeerNumber: proto.Uint32(5),
			},
		},
	}
	sendRequest(c, conn, 0, req)
	_, resp = recvResponse(c, conn)
	c.Assert(resp.PutMeta, NotNil)
	c.Assert(resp.PutMeta.GetMetaType(), Equals, pdpb.MetaType_ClusterType)
	meta := s.getMeta(c, conn, clusterID)
	c.Assert(meta.GetMaxPeerNumber(), Equals, uint32(5))
}

func (s *testClusterSuite) TestCache(c *C) {
	clusterID := uint64(2)

	req := s.newBootstrapRequest(c, clusterID, "127.0.0.1:1")
	node1 := req.Bootstrap.Node
	store1 := req.Bootstrap.Stores[0]

	s.svr.bootstrapCluster(clusterID, req.Bootstrap)

	cluster, err := s.svr.getCluster(clusterID)
	c.Assert(err, IsNil)

	// add another 2 nodes
	node2 := s.newNode(c, 0, "127.0.0.1:2")
	err = cluster.PutNode(node2)
	c.Assert(err, IsNil)
	store2 := s.newStore(c, node2.GetNodeId(), 0)
	err = cluster.PutStore(store2)
	c.Assert(err, IsNil)

	node3 := s.newNode(c, 0, "127.0.0.1:3")
	err = cluster.PutNode(node3)
	c.Assert(err, IsNil)

	nodes := map[uint64]*metapb.Node{
		node1.GetNodeId(): node1,
		node2.GetNodeId(): node2,
		node3.GetNodeId(): node3,
	}

	stores := map[uint64]*metapb.Store{
		store1.GetStoreId(): store1,
		store2.GetStoreId(): store2,
	}

	s.svr.clusterLock.Lock()
	delete(s.svr.clusters, cluster.clusterID)
	cluster.Close()
	s.svr.clusterLock.Unlock()

	cluster, err = s.svr.getCluster(clusterID)
	c.Assert(err, IsNil)

	allNodes, err := cluster.GetAllNodes()
	c.Assert(err, IsNil)
	c.Assert(allNodes, HasLen, 3)
	for _, node := range allNodes {
		_, ok := nodes[node.GetNodeId()]
		c.Assert(ok, IsTrue)
	}

	allStores, err := cluster.GetAllStores()
	c.Assert(err, IsNil)
	c.Assert(allStores, HasLen, 2)
	for _, store := range allStores {
		_, ok := stores[store.GetStoreId()]
		c.Assert(ok, IsTrue)
	}
}
