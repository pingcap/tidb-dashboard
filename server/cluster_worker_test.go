package server

import (
	"net"
	"sync"
	"time"

	"github.com/golang/protobuf/proto"
	"github.com/juju/errors"
	. "github.com/pingcap/check"
	"github.com/pingcap/kvproto/pkg/errorpb"
	"github.com/pingcap/kvproto/pkg/metapb"
	"github.com/pingcap/kvproto/pkg/pdpb"
	"github.com/pingcap/kvproto/pkg/raft_cmdpb"
	"github.com/pingcap/kvproto/pkg/raft_serverpb"
	"github.com/pingcap/kvproto/pkg/raftpb"
)

var _ = Suite(&testClusterWorkerSuite{})

type testClusterWorkerSuite struct {
	testClusterBaseSuite

	clusterID uint64
	nodes     map[uint64]*mockRaftNode
}

func (s *testClusterWorkerSuite) getRootPath() string {
	return "test_cluster_worker"
}

type mockRaftPeer struct {
	peer   metapb.Peer
	region metapb.Region
}

type mockRaftStore struct {
	sync.Mutex

	s *testClusterWorkerSuite

	storeIdent raft_serverpb.StoreIdent

	peers map[uint64]*mockRaftPeer
}

type mockRaftNode struct {
	sync.Mutex

	s *testClusterWorkerSuite

	node metapb.Node

	listener net.Listener

	stores map[uint64]*mockRaftStore
}

func (s *testClusterWorkerSuite) bootstrap(c *C) *mockRaftNode {
	req := s.newBootstrapRequest(c, s.clusterID, "127.0.0.1:0")
	node := req.Bootstrap.Node
	store := req.Bootstrap.Stores[0]
	region := req.Bootstrap.Region

	err := s.svr.bootstrapCluster(s.clusterID, req.Bootstrap)
	c.Assert(err, IsNil)

	raftNode := s.newMockRaftNode(c, node)
	raftStore := raftNode.addStore(c, store)
	raftStore.addRegion(c, region)
	return raftNode
}

func (s *testClusterWorkerSuite) newMockRaftNode(c *C, n *metapb.Node) *mockRaftNode {
	if n == nil {
		n = s.newNode(c, 0, "127.0.0.1:0")
	}

	l, err := net.Listen("tcp", "127.0.0.1:0")
	c.Assert(err, IsNil)

	addr := l.Addr().String()
	n.Address = proto.String(addr)
	node := &mockRaftNode{
		s:        s,
		node:     *n,
		listener: l,
		stores:   make(map[uint64]*mockRaftStore),
	}

	go node.run(c)

	cluster, err := s.svr.getCluster(s.clusterID)
	c.Assert(err, IsNil)

	cluster.PutNode(&node.node)

	s.nodes[n.GetNodeId()] = node

	return node
}

func (n *mockRaftNode) addStore(c *C, s *metapb.Store) *mockRaftStore {
	n.Lock()
	defer n.Unlock()

	if s == nil {
		s = n.s.newStore(c, n.node.GetNodeId(), 0)
	} else {
		c.Assert(s.GetNodeId(), Equals, n.node.GetNodeId())
	}

	store := &mockRaftStore{
		s: n.s,
		storeIdent: raft_serverpb.StoreIdent{
			ClusterId: proto.Uint64(n.s.clusterID),
			NodeId:    proto.Uint64(n.node.GetNodeId()),
			StoreId:   proto.Uint64(s.GetStoreId()),
		},
		peers: make(map[uint64]*mockRaftPeer),
	}

	n.stores[s.GetStoreId()] = store

	cluster, err := n.s.svr.getCluster(n.s.clusterID)
	c.Assert(err, IsNil)
	cluster.PutStore(s)

	return store
}

func (s *mockRaftStore) addRegion(c *C, region *metapb.Region) {
	s.Lock()
	defer s.Unlock()

	storeID := s.storeIdent.GetStoreId()
	var (
		peer  metapb.Peer
		found = false
	)

	for _, p := range region.Peers {
		if p.GetStoreId() == storeID {
			peer = *p
			found = true
			break
		}
	}
	c.Assert(found, IsTrue)
	s.peers[region.GetRegionId()] = &mockRaftPeer{
		peer:   peer,
		region: *region,
	}
}

func (n *mockRaftNode) run(c *C) {
	for {
		conn, err := n.listener.Accept()
		if err != nil {
			c.Logf("accept err %v", err)
			return
		}

		msg := &raft_serverpb.Message{}
		msgID, err := readMessage(conn, msg)
		c.Assert(err, IsNil)

		req := msg.GetCmdReq()
		c.Assert(req, NotNil)

		resp := n.handleRequest(c, req)
		if resp.Header == nil {
			resp.Header = &raft_cmdpb.RaftResponseHeader{}
		}
		resp.Header.Uuid = req.Header.Uuid

		respMsg := &raft_serverpb.Message{
			MsgType: raft_serverpb.MessageType_CommandResp.Enum(),
			CmdResp: resp,
		}

		err = writeMessage(conn, msgID, respMsg)
		c.Assert(err, IsNil)
	}
}

func newErrorCmdResponse(err error) *raft_cmdpb.RaftCommandResponse {
	resp := &raft_cmdpb.RaftCommandResponse{
		Header: &raft_cmdpb.RaftResponseHeader{
			Error: &errorpb.Error{
				Message: proto.String(err.Error()),
			},
		},
	}
	return resp
}

func (n *mockRaftNode) handleRequest(c *C, req *raft_cmdpb.RaftCommandRequest) *raft_cmdpb.RaftCommandResponse {
	storeID := req.Header.Peer.GetStoreId()
	n.Lock()
	store, ok := n.stores[storeID]
	n.Unlock()
	if !ok {
		return newErrorCmdResponse(errors.Errorf("store %d is not found", storeID))
	}

	store.Lock()
	defer store.Unlock()

	// Now we can only test in the first created node.
	// TODO:
	//	1. Use leader check for region, we can control where leader is.
	//	2. Simulate raft message transport, leader can send this request to
	//		other peers directly.

	_, ok = store.peers[req.Header.GetRegionId()]
	if !ok {
		resp := newErrorCmdResponse(errors.New("region not found"))
		resp.Header.Error.KeyNotInRegion = &errorpb.KeyNotInRegion{
			RegionId: proto.Uint64(req.Header.GetRegionId()),
		}
		return resp
	}

	return store.handleRequest(c, req)
}

func (s *mockRaftStore) handleRequest(c *C, req *raft_cmdpb.RaftCommandRequest) *raft_cmdpb.RaftCommandResponse {
	if req.AdminRequest != nil {
		return s.handleAdminRequest(c, req)
	} else if req.StatusRequest != nil {
		return s.handleStatusRequest(c, req)
	} else {
		return newErrorCmdResponse(errors.Errorf("unsupported request %v", req))
	}
}

func (s *mockRaftStore) handleStatusRequest(c *C, req *raft_cmdpb.RaftCommandRequest) *raft_cmdpb.RaftCommandResponse {
	// TODO later
	return newErrorCmdResponse(errors.Errorf("unsupported request %v", req))
}

func (s *mockRaftStore) handleAdminRequest(c *C, req *raft_cmdpb.RaftCommandRequest) *raft_cmdpb.RaftCommandResponse {
	var resp *raft_cmdpb.RaftCommandResponse
	switch req.AdminRequest.GetCmdType() {
	case raft_cmdpb.AdminCommandType_ChangePeer:
		resp = s.handleChangePeer(c, req)
	case raft_cmdpb.AdminCommandType_Split:
		resp = s.handleSplit(c, req)
	}

	if resp.AdminResponse != nil {
		resp.AdminResponse.CmdType = req.AdminRequest.CmdType
	}
	return resp
}

func (s *mockRaftStore) handleChangePeer(c *C, req *raft_cmdpb.RaftCommandRequest) *raft_cmdpb.RaftCommandResponse {
	changePeer := req.AdminRequest.ChangePeer
	confType := changePeer.GetChangeType()
	peer := changePeer.Peer

	raftPeer := s.peers[req.Header.GetRegionId()]
	region := raftPeer.region
	c.Assert(region.GetRegionId(), Equals, req.Header.GetRegionId())

	if confType == raftpb.ConfChangeType_AddNode {
		for _, p := range raftPeer.region.Peers {
			if p.GetPeerId() == peer.GetPeerId() || p.GetStoreId() == peer.GetStoreId() {
				return newErrorCmdResponse(errors.Errorf("add duplicated peer %v for region %v", peer, region))
			}
		}
		c.Assert(peer.GetPeerId(), Greater, region.GetMaxPeerId())
		region.Peers = append(region.Peers, peer)
		region.MaxPeerId = proto.Uint64(peer.GetPeerId())
		raftPeer.region = region
	} else {
		foundIndex := -1
		for i, p := range region.Peers {
			if p.GetPeerId() == peer.GetPeerId() {
				foundIndex = i
				break
			}
		}

		if foundIndex == -1 {
			return newErrorCmdResponse(errors.Errorf("remove missing peer %v for region %v", peer, region))
		}

		region.Peers = append(region.Peers[:foundIndex], region.Peers[foundIndex+1:]...)
		raftPeer.region = region

		// remove itself
		if peer.GetStoreId() == s.storeIdent.GetStoreId() {
			delete(s.peers, region.GetRegionId())
		}
	}

	resp := &raft_cmdpb.RaftCommandResponse{
		AdminResponse: &raft_cmdpb.AdminResponse{
			ChangePeer: &raft_cmdpb.ChangePeerResponse{
				Region: &region,
			},
		},
	}
	return resp
}

func (s *mockRaftStore) handleSplit(c *C, req *raft_cmdpb.RaftCommandRequest) *raft_cmdpb.RaftCommandResponse {
	// TODO later
	return newErrorCmdResponse(errors.Errorf("unsupported request %v", req))
}

func (s *testClusterWorkerSuite) SetUpSuite(c *C) {
	s.clusterID = 1

	s.nodes = make(map[uint64]*mockRaftNode)

	s.svr = newTestServer(c, s.getRootPath())

	s.client = newEtcdClient(c)

	deleteRoot(c, s.client, s.getRootPath())

	go s.svr.Run()

	mustGetLeader(c, s.client, s.getRootPath())

	// Construct the raft cluster, 3 nodes, n1, n2, and n3
	// and 5 stores, s11, s12 in n1, s21, s22 in n2 and s31 in n3.
	raftNode1 := s.bootstrap(c)
	raftNode1.addStore(c, nil)

	raftNode2 := s.newMockRaftNode(c, nil)
	raftNode2.addStore(c, nil)
	raftNode2.addStore(c, nil)

	raftNode3 := s.newMockRaftNode(c, nil)
	raftNode3.addStore(c, nil)

	cluster, err := s.svr.getCluster(s.clusterID)
	c.Assert(err, IsNil)
	cluster.PutMeta(&metapb.Cluster{
		ClusterId:     proto.Uint64(s.clusterID),
		MaxPeerNumber: proto.Uint32(5),
	})

	nodes, err := cluster.GetAllNodes()
	c.Assert(err, IsNil)
	c.Assert(nodes, HasLen, 3)

	stores, err := cluster.GetAllStores()
	c.Assert(err, IsNil)
	c.Assert(stores, HasLen, 5)
}

func (s *testClusterWorkerSuite) TearDownSuite(c *C) {
	s.svr.Close()
	s.client.Close()
}

func (s *testClusterWorkerSuite) checkRegionPeerNumber(c *C, regionKey []byte, expectNumber int) *metapb.Region {
	cluster, err := s.svr.getCluster(s.clusterID)
	c.Assert(err, IsNil)

	for i := 0; i < 10; i++ {
		region, err1 := cluster.GetRegion(regionKey)
		c.Assert(err1, IsNil)
		if len(region.Peers) == expectNumber {
			return region
		}
		time.Sleep(100 * time.Millisecond)
	}
	region, err := cluster.GetRegion(regionKey)
	c.Assert(err, IsNil)
	c.Assert(region.Peers, HasLen, expectNumber)
	return region
}

func (s *testClusterWorkerSuite) TestBaseChangePeer(c *C) {
	cluster, err := s.svr.getCluster(s.clusterID)
	c.Assert(err, IsNil)

	meta, err := cluster.GetMeta()
	c.Assert(err, IsNil)
	c.Assert(meta.GetMaxPeerNumber(), Equals, uint32(5))

	regionKey := []byte("a")
	region, err := cluster.GetRegion(regionKey)
	c.Assert(err, IsNil)

	c.Assert(region.Peers, HasLen, 1)

	leaderPeer := *region.Peers[0]
	leaderPd := mustGetLeader(c, s.client, s.getRootPath())

	conn, err := net.Dial("tcp", leaderPd.GetAddr())
	c.Assert(err, IsNil)
	defer conn.Close()

	// add another 4 peers.
	for i := 0; i < 4; i++ {
		askChangePeer := &pdpb.Request{
			Header:  newRequestHeader(s.clusterID),
			CmdType: pdpb.CommandType_AskChangePeer.Enum(),
			AskChangePeer: &pdpb.AskChangePeerRequest{
				Leader: &leaderPeer,
				Region: region,
			},
		}
		sendRequest(c, conn, 0, askChangePeer)
		_, resp := recvResponse(c, conn)
		c.Assert(resp.GetCmdType(), Equals, pdpb.CommandType_AskChangePeer)

		region = s.checkRegionPeerNumber(c, regionKey, i+2)
	}

	region = s.checkRegionPeerNumber(c, regionKey, 5)

	err = cluster.PutMeta(&metapb.Cluster{
		ClusterId:     proto.Uint64(s.clusterID),
		MaxPeerNumber: proto.Uint32(3),
	})
	c.Assert(err, IsNil)

	// remove 2 peers
	for i := 0; i < 2; i++ {
		askChangePeer := &pdpb.Request{
			Header:  newRequestHeader(s.clusterID),
			CmdType: pdpb.CommandType_AskChangePeer.Enum(),
			AskChangePeer: &pdpb.AskChangePeerRequest{
				Leader: &leaderPeer,
				Region: region,
			},
		}
		sendRequest(c, conn, 0, askChangePeer)
		_, resp := recvResponse(c, conn)
		c.Assert(resp.GetCmdType(), Equals, pdpb.CommandType_AskChangePeer)

		region = s.checkRegionPeerNumber(c, regionKey, 4-i)
	}

	s.checkRegionPeerNumber(c, regionKey, 3)
}
