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

func (s *mockRaftStore) addPeer(c *C, region *metapb.Region) {
	s.Lock()
	defer s.Unlock()

	storeID := s.store.GetId()
	var (
		peer  *metapb.Peer
		found = false
	)

	for _, p := range region.Peers {
		if p.GetStoreId() == storeID {
			peer = p
			found = true
			break
		}
	}
	c.Assert(found, IsTrue)
	s.peers[peer.GetId()] = peer
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
	raftStore.addPeer(c, region)
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

func (s *testClusterWorkerSuite) processChangePeerRes(c *C, res *pdpb.RegionHeartbeatResponse, tp raftpb.ConfChangeType, region *metapb.Region) {
	changePeer := res.GetChangePeer()
	c.Assert(changePeer, NotNil)
	c.Assert(changePeer.GetChangeType(), Equals, tp)
	peer := changePeer.GetPeer()
	c.Assert(peer, NotNil)

	store, ok := s.stores[peer.GetStoreId()]
	c.Assert(ok, IsTrue)
	c.Assert(store.peers, Not(HasKey), peer.GetId())
	c.Logf("peer: %v", peer)

	if tp == raftpb.ConfChangeType_AddNode {
		region.Peers = append(region.Peers, peer)
		store.addPeer(c, region)
	} else if tp == raftpb.ConfChangeType_RemoveNode {

	} else {
		c.Fatalf("invalid conf change type, %v", tp)
	}
}

func (s *testClusterWorkerSuite) TestChangePeer(c *C) {
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

	// Test 1: add a new peer.
	leaderPeer := s.chooseRegionLeader(c, region)

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

	// Check Test 1: check RegionHeartbeat response.
	regionHeartbeatRes := resp.GetRegionHeartbeat()
	s.processChangePeerRes(c, regionHeartbeatRes, raftpb.ConfChangeType_AddNode, region)

	// Test 1: update region epoch and check region info.
	region.RegionEpoch.ConfVer = proto.Uint64(region.GetRegionEpoch().GetConfVer() + 1)
	sendRequest(c, conn, 0, changePeerHeartbeatReq)
	_, resp = recvResponse(c, conn)
	c.Assert(resp.GetCmdType(), Equals, pdpb.CommandType_RegionHeartbeat)

	// check region peer number.
	region = s.checkRegionPeerNumber(c, regionKey, 2)
}
