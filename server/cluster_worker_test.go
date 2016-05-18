package server

import (
	"math/rand"
	"net"
	"sync"
	"time"

	"github.com/golang/protobuf/proto"
	. "github.com/pingcap/check"
	"github.com/pingcap/kvproto/pkg/metapb"
	"github.com/pingcap/kvproto/pkg/pdpb"
	"github.com/pingcap/kvproto/pkg/raftpb"
)

var _ = Suite(&testClusterWorkerSuite{})

type mockRaftStore struct {
	sync.Mutex

	s *testClusterWorkerSuite

	listener net.Listener

	store *metapb.Store

	// peerID -> Peer
	peers map[uint64]*metapb.Peer
}

func (s *mockRaftStore) addPeer(c *C, peer *metapb.Peer) {
	s.Lock()
	defer s.Unlock()

	c.Assert(s.peers, Not(HasKey), peer.GetId())
	s.peers[peer.GetId()] = peer
}

func (s *mockRaftStore) removePeer(c *C, peer *metapb.Peer) {
	s.Lock()
	defer s.Unlock()

	c.Assert(s.peers, HasKey, peer.GetId())
	delete(s.peers, peer.GetId())
}

func addRegionPeer(c *C, region *metapb.Region, peer *metapb.Peer) {
	found := false
	for _, p := range region.Peers {
		if p.GetId() == peer.GetId() {
			found = true
			break
		}
	}

	c.Assert(found, IsFalse)
	region.Peers = append(region.Peers, peer)
}

func removeRegionPeer(c *C, region *metapb.Region, peer *metapb.Peer) {
	found := false
	peers := make([]*metapb.Peer, 0, len(region.Peers))
	for _, p := range region.Peers {
		if p.GetId() == peer.GetId() {
			found = true
			continue
		}

		peers = append(peers, p)
	}

	c.Assert(found, IsTrue)
	region.Peers = peers
}

type testClusterWorkerSuite struct {
	testClusterBaseSuite

	clusterID uint64

	storeLock sync.Mutex
	// storeID -> mockRaftStore
	stores map[uint64]*mockRaftStore

	regionLeaderLock sync.Mutex
	// regionID -> Peer
	regionLeaders map[uint64]metapb.Peer
}

func (s *testClusterWorkerSuite) clearRegionLeader(c *C, regionID uint64) {
	s.regionLeaderLock.Lock()
	defer s.regionLeaderLock.Unlock()

	delete(s.regionLeaders, regionID)
}

func (s *testClusterWorkerSuite) chooseRegionLeader(c *C, region *metapb.Region) *metapb.Peer {
	// Randomly select a peer in the region as the leader.
	peer := region.Peers[rand.Intn(len(region.Peers))]

	s.regionLeaderLock.Lock()
	defer s.regionLeaderLock.Unlock()

	s.regionLeaders[region.GetId()] = *peer
	return peer
}

func (s *testClusterWorkerSuite) bootstrap(c *C) *mockRaftStore {
	req := s.newBootstrapRequest(c, s.clusterID, "127.0.0.1:0")
	store := req.Bootstrap.Store
	region := req.Bootstrap.Region

	_, err := s.svr.bootstrapCluster(req.Bootstrap)
	c.Assert(err, IsNil)

	raftStore := s.newMockRaftStore(c, store)
	c.Assert(region.Peers, HasLen, 1)
	raftStore.addPeer(c, region.Peers[0])
	return raftStore
}

func (s *testClusterWorkerSuite) newMockRaftStore(c *C, metaStore *metapb.Store) *mockRaftStore {
	if metaStore == nil {
		metaStore = s.newStore(c, 0, "127.0.0.1:0")
	}

	l, err := net.Listen("tcp", "127.0.0.1:0")
	c.Assert(err, IsNil)

	addr := l.Addr().String()
	metaStore.Address = proto.String(addr)
	store := &mockRaftStore{
		s:        s,
		listener: l,
		store:    metaStore,
		peers:    make(map[uint64]*metapb.Peer),
	}

	cluster, err := s.svr.getRaftCluster()
	c.Assert(err, IsNil)

	cluster.PutStore(metaStore)

	s.storeLock.Lock()
	defer s.storeLock.Unlock()

	s.stores[metaStore.GetId()] = store
	return store
}

func (s *testClusterWorkerSuite) getRootPath() string {
	return "test_cluster_worker"
}

func (s *testClusterWorkerSuite) SetUpSuite(c *C) {
	s.clusterID = 0

	s.stores = make(map[uint64]*mockRaftStore)

	s.svr = newTestServer(c, s.getRootPath())
	s.svr.cfg.nextRetryDelay = 50 * time.Millisecond

	s.client = newEtcdClient(c)

	s.regionLeaders = make(map[uint64]metapb.Peer)

	deleteRoot(c, s.client, s.getRootPath())

	go s.svr.Run()

	mustGetLeader(c, s.client, s.svr.getLeaderPath())

	// Build raft cluster with 5 stores.
	s.bootstrap(c)
	s.newMockRaftStore(c, nil)
	s.newMockRaftStore(c, nil)
	s.newMockRaftStore(c, nil)
	s.newMockRaftStore(c, nil)

	cluster, err := s.svr.getRaftCluster()
	c.Assert(err, IsNil)
	cluster.PutConfig(&metapb.Cluster{
		Id:            proto.Uint64(s.clusterID),
		MaxPeerNumber: proto.Uint32(5),
	})

	stores, err := cluster.GetAllStores()
	c.Assert(err, IsNil)
	c.Assert(stores, HasLen, 5)
}

func (s *testClusterWorkerSuite) TearDownSuite(c *C) {
	s.svr.Close()
	s.client.Close()
}

func (s *testClusterWorkerSuite) checkRegionPeerNumber(c *C, regionKey []byte, expectNumber int) *metapb.Region {
	cluster, err := s.svr.getRaftCluster()
	c.Assert(err, IsNil)

	region, err := cluster.GetRegion(regionKey)
	c.Assert(err, IsNil)
	c.Assert(region.Peers, HasLen, expectNumber)
	return region
}

func (s *testClusterWorkerSuite) checkChangePeerRes(c *C, res *pdpb.RegionHeartbeatResponse, tp raftpb.ConfChangeType, region *metapb.Region) {
	changePeer := res.GetChangePeer()
	c.Assert(changePeer, NotNil)
	c.Assert(changePeer.GetChangeType(), Equals, tp)
	peer := changePeer.GetPeer()
	c.Assert(peer, NotNil)

	store, ok := s.stores[peer.GetStoreId()]
	c.Assert(ok, IsTrue)

	if tp == raftpb.ConfChangeType_AddNode {
		c.Assert(store.peers, Not(HasKey), peer.GetId())
		store.addPeer(c, peer)
		addRegionPeer(c, region, peer)
	} else if tp == raftpb.ConfChangeType_RemoveNode {
		c.Assert(store.peers, HasKey, peer.GetId())
		store.removePeer(c, peer)
		removeRegionPeer(c, region, peer)
	} else {
		c.Fatalf("invalid conf change type, %v", tp)
	}
}

func (s *testClusterWorkerSuite) TestHeartbeatChangePeer(c *C) {
	cluster, err := s.svr.getRaftCluster()
	c.Assert(err, IsNil)

	meta, err := cluster.GetConfig()
	c.Assert(err, IsNil)
	c.Assert(meta.GetMaxPeerNumber(), Equals, uint32(5))

	// There is only one region now, directly use it for test.
	regionKey := []byte("a")
	region, err := cluster.GetRegion(regionKey)
	c.Assert(err, IsNil)
	c.Assert(region.Peers, HasLen, 1)

	leaderPd := mustGetLeader(c, s.client, s.svr.getLeaderPath())

	conn, err := net.Dial("tcp", leaderPd.GetAddr())
	c.Assert(err, IsNil)
	defer conn.Close()

	leaderPeer := s.chooseRegionLeader(c, region)
	c.Logf("[leaderPeer]:%v, [region]:%v", leaderPeer, region)

	// Add 4 peers.
	for i := 0; i < 4; i++ {
		changePeerHeartbeatReq := &pdpb.Request{
			Header:  newRequestHeader(s.clusterID),
			CmdType: pdpb.CommandType_RegionHeartbeat.Enum(),
			RegionHeartbeat: &pdpb.RegionHeartbeatRequest{
				Leader: leaderPeer,
				Region: region,
			},
		}

		sendRequest(c, conn, 0, changePeerHeartbeatReq)
		_, resp := recvResponse(c, conn)
		c.Assert(resp.GetCmdType(), Equals, pdpb.CommandType_RegionHeartbeat)

		// Check RegionHeartbeat response.
		s.checkChangePeerRes(c, resp.GetRegionHeartbeat(), raftpb.ConfChangeType_AddNode, region)
		c.Logf("[add peer][region]:%v", region)

		// Update region epoch and check region info.
		region.RegionEpoch.ConfVer = proto.Uint64(region.GetRegionEpoch().GetConfVer() + 1)
		sendRequest(c, conn, 0, changePeerHeartbeatReq)
		_, resp = recvResponse(c, conn)
		c.Assert(resp.GetCmdType(), Equals, pdpb.CommandType_RegionHeartbeat)

		// Check region peer number.
		region = s.checkRegionPeerNumber(c, regionKey, i+2)
	}

	region = s.checkRegionPeerNumber(c, regionKey, 5)

	// Remove 2 peers.
	err = cluster.PutConfig(&metapb.Cluster{
		Id:            proto.Uint64(s.clusterID),
		MaxPeerNumber: proto.Uint32(3),
	})
	c.Assert(err, IsNil)

	// Remove 2 peers
	for i := 0; i < 2; i++ {
		changePeerHeartbeatReq := &pdpb.Request{
			Header:  newRequestHeader(s.clusterID),
			CmdType: pdpb.CommandType_RegionHeartbeat.Enum(),
			RegionHeartbeat: &pdpb.RegionHeartbeatRequest{
				Leader: leaderPeer,
				Region: region,
			},
		}

		sendRequest(c, conn, 0, changePeerHeartbeatReq)
		_, resp := recvResponse(c, conn)
		c.Assert(resp.GetCmdType(), Equals, pdpb.CommandType_RegionHeartbeat)

		// Check RegionHeartbeat response.
		s.checkChangePeerRes(c, resp.GetRegionHeartbeat(), raftpb.ConfChangeType_RemoveNode, region)

		// Update region epoch and check region info.
		region.RegionEpoch.ConfVer = proto.Uint64(region.GetRegionEpoch().GetConfVer() + 1)
		sendRequest(c, conn, 0, changePeerHeartbeatReq)
		_, resp = recvResponse(c, conn)
		c.Assert(resp.GetCmdType(), Equals, pdpb.CommandType_RegionHeartbeat)

		// Check region peer number.
		region = s.checkRegionPeerNumber(c, regionKey, 4-i)
	}

	region = s.checkRegionPeerNumber(c, regionKey, 3)
}
