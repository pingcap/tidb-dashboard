package server

import (
	"bytes"
	"fmt"
	"path"
	"strconv"
	"strings"
	"sync"

	"github.com/coreos/etcd/clientv3"
	"github.com/gogo/protobuf/proto"
	"github.com/juju/errors"
	"github.com/ngaut/log"
	"github.com/pingcap/kvproto/pkg/metapb"
	"github.com/pingcap/kvproto/pkg/pdpb"
	"golang.org/x/net/context"
)

const (
	// defaultMaxPeerNumber is the default max peer number for a region.
	defaultMaxPeerNumber = uint32(3)
	askJobChannelSize    = 1024
)

var (
	errClusterNotBootstrapped = errors.New("cluster is not bootstrapped")
)

// Raft cluster key format:
// cluster 1 -> /raft/1, value is metapb.Cluster
// cluster 2 -> /raft/2
// For cluster 1
// node 1 -> /raft/1/n/1, value is metapb.Node
// store 1 -> /raft/1/s/1, value is metapb.Store
// region 1 -> /raft/1/r/1, value is encoded_region_key
// region search key map -> /raft/1/k/encoded_region_key, value is metapb.Region
//
// Operation queue, pd can only handle operations like auto-balance, split,
// merge sequentially, and every operation will be assigned a unique incremental ID.
// pending queue -> /raft/1/j/1, /raft/1/j/2, value is operation job.
//
// Encode region search key:
//  1, the maximum end region key is empty, so the encode key is \xFF
//  2, other region end key is not empty, the encode key is \z end_key

type raftCluster struct {
	s *Server

	clusterID   uint64
	clusterRoot string

	wg sync.WaitGroup

	quitCh chan struct{}

	askJobCh chan struct{}

	mu struct {
		sync.RWMutex
		// TODO: keep meta revision
		// cluster meta cache
		meta metapb.Cluster

		// node cache
		nodes map[uint64]metapb.Node
		// store cache
		stores map[uint64]metapb.Store
	}
}

func (s *Server) newCluster(clusterID uint64, meta metapb.Cluster) (*raftCluster, error) {
	c := &raftCluster{
		s:           s,
		clusterID:   clusterID,
		clusterRoot: s.getClusterRootPath(clusterID),
		askJobCh:    make(chan struct{}, askJobChannelSize),
		quitCh:      make(chan struct{}),
	}

	// Force checking the pending job.
	c.askJobCh <- struct{}{}

	mu := &c.mu
	mu.meta = meta

	// Cache all nodes/stores when start the cluster. We don't have
	// many nodes/stores, so it is OK to cache them all.
	// And we should use these cache for later ChangePeer too.
	if err := c.cacheAllNodes(); err != nil {
		return nil, errors.Trace(err)
	}

	if err := c.cacheAllStores(); err != nil {
		return nil, errors.Trace(err)
	}

	c.wg.Add(1)
	go c.onJobWorker()

	return c, nil
}

func (c *raftCluster) Close() {
	close(c.quitCh)
	c.wg.Wait()
}

func (s *Server) getClusterRootPath(clusterID uint64) string {
	return path.Join(s.cfg.RootPath, "raft", strconv.FormatUint(clusterID, 10))
}

func (s *Server) getCluster(clusterID uint64) (*raftCluster, error) {
	s.clusterLock.RLock()
	c, ok := s.clusters[clusterID]
	s.clusterLock.RUnlock()

	if ok {
		return c, nil
	}

	// Find in etcd
	value, err := getValue(s.client, s.getClusterRootPath(clusterID))
	if err != nil {
		return nil, errors.Trace(err)
	}
	if value == nil {
		return nil, nil
	}

	m := metapb.Cluster{}
	if err = proto.Unmarshal(value, &m); err != nil {
		return nil, errors.Trace(err)
	}

	s.clusterLock.Lock()
	defer s.clusterLock.Unlock()

	// check again, other goroutine may create it already.
	c, ok = s.clusters[clusterID]
	if ok {
		return c, nil
	}

	if c, err = s.newCluster(clusterID, m); err != nil {
		return nil, errors.Trace(err)
	}

	s.clusters[clusterID] = c
	return c, nil
}

func (s *Server) closeClusters() {
	s.clusterLock.Lock()
	defer s.clusterLock.Unlock()

	if len(s.clusters) == 0 {
		return
	}

	for _, cluster := range s.clusters {
		cluster.Close()
	}

	s.clusters = make(map[uint64]*raftCluster)
}

func encodeRegionSearchKey(endKey []byte) string {
	if len(endKey) == 0 {
		return "\xFF"
	}

	return string(append([]byte{'z'}, endKey...))
}

func makeNodeKey(clusterRootPath string, nodeID uint64) string {
	return strings.Join([]string{clusterRootPath, "n", strconv.FormatUint(nodeID, 10)}, "/")
}

func makeStoreKey(clusterRootPath string, storeID uint64) string {
	return strings.Join([]string{clusterRootPath, "s", strconv.FormatUint(storeID, 10)}, "/")
}

func makeRegionKey(clusterRootPath string, regionID uint64) string {
	return strings.Join([]string{clusterRootPath, "r", strconv.FormatUint(regionID, 10)}, "/")
}

func makeRegionSearchKey(clusterRootPath string, endKey []byte) string {
	return strings.Join([]string{clusterRootPath, "k", encodeRegionSearchKey(endKey)}, "/")
}

func makeJobKey(clusterRootPath string, jobID uint64) string {
	// We must guarantee the job handling order, so use %020d to format the job key,
	// use etcd range get to get the first job and then handle it.
	// Should we use a 8 bytes binary BigEndian instead of 20 bytes string?
	return strings.Join([]string{clusterRootPath, "job", fmt.Sprintf("%020d", jobID)}, "/")
}

func makeNodeKeyPrefix(clusterRootPath string) string {
	return strings.Join([]string{clusterRootPath, "n", ""}, "/")
}

func makeStoreKeyPrefix(clusterRootPath string) string {
	return strings.Join([]string{clusterRootPath, "s", ""}, "/")
}

func checkBootstrapRequest(clusterID uint64, req *pdpb.BootstrapRequest) error {
	// TODO: do more check for request fields validation.

	nodeMeta := req.GetNode()
	if nodeMeta == nil {
		return errors.Errorf("missing node meta for bootstrap %d", clusterID)
	} else if nodeMeta.GetNodeId() == 0 {
		return errors.New("invalid zero node id")
	}

	storesMeta := req.GetStores()
	if storesMeta == nil || len(storesMeta) == 0 {
		return errors.Errorf("missing stores meta for bootstrap %d", clusterID)
	}

	regionMeta := req.GetRegion()
	if regionMeta == nil {
		return errors.Errorf("missing region meta for bootstrap %d", clusterID)
	} else if len(regionMeta.GetStartKey()) > 0 || len(regionMeta.GetEndKey()) > 0 {
		// first region start/end key must be empty
		return errors.Errorf("invalid first region key range, must all be empty for bootstrap %d", clusterID)
	} else if regionMeta.GetRegionId() == 0 {
		return errors.New("invalid zero region id")
	}

	peers := regionMeta.GetPeers()
	if len(peers) != 1 {
		return errors.Errorf("invalid first region peer number %d, must be 1 for bootstrap %d", len(peers), clusterID)
	}

	peer := peers[0]

	if peer.GetNodeId() != nodeMeta.GetNodeId() {
		return errors.Errorf("invalid peer node id %d != %d for bootstrap %d", peer.GetNodeId(), nodeMeta.GetNodeId(), clusterID)
	} else if peer.GetPeerId() == 0 {
		return errors.New("invalid zero peer id")
	}

	found := false
	storeIDs := make(map[uint64]struct{})
	for _, storeMeta := range storesMeta {
		storeID := storeMeta.GetStoreId()
		if storeID == 0 {
			return errors.New("invalid zero store id")
		}

		_, ok := storeIDs[storeID]
		if ok {
			return errors.Errorf("duplicated store id in %v for bootstrap %d", storesMeta, clusterID)
		}
		storeIDs[storeID] = struct{}{}

		if storeMeta.GetNodeId() != nodeMeta.GetNodeId() {
			return errors.Errorf("invalid store node id %d != %d for bootstrap %d", storeMeta.GetNodeId(), nodeMeta.GetNodeId(), clusterID)
		}

		if storeID == peer.GetStoreId() {
			found = true
		}
	}

	if !found {
		return errors.Errorf("invalid peer store id %d, not in %v for bootstrap %d", peer.GetStoreId(), storesMeta, clusterID)
	}

	return nil
}

func (s *Server) bootstrapCluster(clusterID uint64, req *pdpb.BootstrapRequest) error {
	log.Infof("try to bootstrap cluster %d with %v", clusterID, req)

	if err := checkBootstrapRequest(clusterID, req); err != nil {
		return errors.Trace(err)
	}

	clusterMeta := metapb.Cluster{
		ClusterId:     proto.Uint64(clusterID),
		MaxPeerNumber: proto.Uint32(defaultMaxPeerNumber),
	}

	// Set cluster meta
	clusterValue, err := proto.Marshal(&clusterMeta)
	if err != nil {
		return errors.Trace(err)
	}
	clusterRootPath := s.getClusterRootPath(clusterID)

	var ops []clientv3.Op
	ops = append(ops, clientv3.OpPut(clusterRootPath, string(clusterValue)))

	// Set node meta
	nodePath := makeNodeKey(clusterRootPath, req.GetNode().GetNodeId())
	nodeValue, err := proto.Marshal(req.GetNode())
	if err != nil {
		return errors.Trace(err)
	}
	ops = append(ops, clientv3.OpPut(nodePath, string(nodeValue)))

	// Set store meta
	for _, storeMeta := range req.GetStores() {
		storePath := makeStoreKey(clusterRootPath, storeMeta.GetStoreId())
		storeValue, err1 := proto.Marshal(storeMeta)
		if err1 != nil {
			return errors.Trace(err1)
		}
		ops = append(ops, clientv3.OpPut(storePath, string(storeValue)))
	}

	// Set region id -> search key
	regionPath := makeRegionKey(clusterRootPath, req.GetRegion().GetRegionId())
	ops = append(ops, clientv3.OpPut(regionPath, encodeRegionSearchKey(req.GetRegion().GetEndKey())))

	// Set region meta with search key
	regionSearchPath := makeRegionSearchKey(clusterRootPath, req.GetRegion().GetEndKey())
	regionValue, err := proto.Marshal(req.GetRegion())
	if err != nil {
		return errors.Trace(err)
	}
	ops = append(ops, clientv3.OpPut(regionSearchPath, string(regionValue)))

	// TODO: we must figure out a better to handle bootstrap failed, maybe intervene manually.
	bootstrapCmp := clientv3.Compare(clientv3.CreateRevision(clusterRootPath), "=", 0)
	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	resp, err := s.client.Txn(ctx).
		If(s.leaderCmp(), bootstrapCmp).
		Then(ops...).
		Commit()
	cancel()
	if err != nil {
		return errors.Trace(err)
	}
	if !resp.Succeeded {
		return errors.Errorf("bootstrap cluster %d fail, we may be not leader", clusterID)
	}

	log.Infof("bootstrap cluster %d ok", clusterID)

	s.clusterLock.Lock()
	defer s.clusterLock.Unlock()

	if _, ok := s.clusters[clusterID]; ok {
		// We have bootstrapped cluster ok, and another goroutine quickly requests to
		// use this cluster and we create the cluster object for it.
		// But can this really happen?
		log.Errorf("cluster object %d already exists", clusterID)
		return nil
	}

	c, err := s.newCluster(clusterID, clusterMeta)
	if err != nil {
		return errors.Trace(err)
	}

	mu := &c.mu
	mu.Lock()
	defer mu.Unlock()
	mu.nodes[req.GetNode().GetNodeId()] = *req.GetNode()
	for _, storeMeta := range req.GetStores() {
		mu.stores[storeMeta.GetStoreId()] = *storeMeta
	}

	s.clusters[clusterID] = c

	return nil
}

func (c *raftCluster) cacheAllNodes() error {
	mu := &c.mu
	mu.Lock()
	defer mu.Unlock()

	kv := clientv3.NewKV(c.s.client)

	key := makeNodeKeyPrefix(c.clusterRoot)
	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	resp, err := kv.Get(ctx, key, clientv3.WithPrefix())
	cancel()

	if err != nil {
		return errors.Trace(err)
	}

	mu.nodes = make(map[uint64]metapb.Node)
	for _, kv := range resp.Kvs {
		node := metapb.Node{}
		if err = proto.Unmarshal(kv.Value, &node); err != nil {
			return errors.Trace(err)
		}

		nodeID := node.GetNodeId()
		mu.nodes[nodeID] = node
	}

	return nil
}

func (c *raftCluster) cacheAllStores() error {
	mu := &c.mu
	mu.Lock()
	defer mu.Unlock()

	kv := clientv3.NewKV(c.s.client)

	key := makeStoreKeyPrefix(c.clusterRoot)
	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	resp, err := kv.Get(ctx, key, clientv3.WithPrefix())
	cancel()

	if err != nil {
		return errors.Trace(err)
	}

	mu.stores = make(map[uint64]metapb.Store)
	for _, kv := range resp.Kvs {
		store := metapb.Store{}
		if err = proto.Unmarshal(kv.Value, &store); err != nil {
			return errors.Trace(err)
		}

		storeID := store.GetStoreId()
		mu.stores[storeID] = store
	}

	return nil
}

func (c *raftCluster) GetAllNodes() ([]metapb.Node, error) {
	mu := &c.mu
	mu.RLock()
	defer mu.RUnlock()

	nodes := make([]metapb.Node, 0, len(mu.nodes))
	for _, node := range mu.nodes {
		nodes = append(nodes, node)
	}

	return nodes, nil
}

func (c *raftCluster) GetNode(nodeID uint64) (*metapb.Node, error) {
	if nodeID == 0 {
		return nil, errors.New("invalid zero node id")
	}

	mu := &c.mu
	mu.RLock()
	defer mu.RUnlock()

	// We cache all nodes when start the cluster, and PutNode can also
	// update the cache, so we can use this cache to get directly.

	node, ok := mu.nodes[nodeID]
	if ok {
		return &node, nil
	}

	return nil, errors.Errorf("invalid node ID %d, not found", nodeID)
}

func (c *raftCluster) GetAllStores() ([]metapb.Store, error) {
	mu := &c.mu
	mu.RLock()
	defer mu.RUnlock()

	stores := make([]metapb.Store, 0, len(mu.stores))
	for _, store := range mu.stores {
		stores = append(stores, store)
	}

	return stores, nil
}

func (c *raftCluster) GetStore(storeID uint64) (*metapb.Store, error) {
	if storeID == 0 {
		return nil, errors.New("invalid zero store id")
	}

	mu := &c.mu
	mu.RLock()
	defer mu.RUnlock()

	// We cache all stores when start the cluster, and PutStore can also
	// update the cache, so we can use this cache to get directly.

	store, ok := mu.stores[storeID]
	if ok {
		return &store, nil
	}

	return nil, errors.Errorf("invalid store ID %d, not found", storeID)
}

func (c *raftCluster) GetRegion(regionKey []byte) (*metapb.Region, error) {
	if len(regionKey) == 0 {
		return nil, errors.New("invalid empty region key")
	}

	// We must use the next region key for search,
	// e,g, we have two regions 1, 2, and key ranges are ["", "abc"), ["abc", +infinite),
	// if we use "abc" to search the region, the first key >= "abc" may be
	// region 1, not region 2. So we use the next region key for search.
	nextRegionKey := append(regionKey, 0x00)
	searchKey := makeRegionSearchKey(c.clusterRoot, nextRegionKey)

	// Etcd range search is for range [searchKey, endKey), if we want to get
	// the latest region, we should use next max end key for search range.
	// TODO: we can generate these keys in initialization.
	maxEndKey := makeRegionSearchKey(c.clusterRoot, []byte{})
	maxSearchEndKey := maxEndKey + "\x00"

	// Find the first region with end key >= searchKey
	region := metapb.Region{}
	ok, err := getProtoMsg(c.s.client, searchKey, &region, clientv3.WithRange(string(maxSearchEndKey)), clientv3.WithLimit(1))
	if err != nil {
		return nil, errors.Trace(err)
	}
	if !ok {
		return nil, errors.Errorf("we must find a region for %q but fail, a serious bug", regionKey)
	}

	if bytes.Compare(regionKey, region.GetStartKey()) >= 0 &&
		(len(region.GetEndKey()) == 0 || bytes.Compare(regionKey, region.GetEndKey()) < 0) {
		return &region, nil
	}

	return nil, errors.Errorf("invalid searched region %v for key %q", region, regionKey)
}

func (c *raftCluster) PutNode(node *metapb.Node) error {
	if node == nil || node.GetNodeId() == 0 {
		return errors.Errorf("invalid put node %v", node)
	}

	nodeValue, err := proto.Marshal(node)
	if err != nil {
		return errors.Trace(err)
	}

	nodePath := makeNodeKey(c.clusterRoot, node.GetNodeId())

	mu := &c.mu
	mu.Lock()
	defer mu.Unlock()

	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	resp, err := c.s.client.Txn(ctx).
		If(c.s.leaderCmp()).
		Then(clientv3.OpPut(nodePath, string(nodeValue))).
		Commit()
	cancel()
	if err != nil {
		return errors.Trace(err)
	}
	if !resp.Succeeded {
		return errors.Errorf("put node %v fail", node)
	}

	mu.nodes[node.GetNodeId()] = *node

	return nil
}

func (c *raftCluster) PutStore(store *metapb.Store) error {
	if store == nil || store.GetStoreId() == 0 {
		return errors.Errorf("invalid put store %v", store)
	}

	storeValue, err := proto.Marshal(store)
	if err != nil {
		return errors.Trace(err)
	}

	storePath := makeStoreKey(c.clusterRoot, store.GetStoreId())

	// The associated node must exist.
	nodePath := makeNodeKey(c.clusterRoot, store.GetNodeId())

	mu := &c.mu
	mu.Lock()
	defer mu.Unlock()

	nodeCreatedCmp := clientv3.Compare(clientv3.CreateRevision(nodePath), ">", 0)
	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	resp, err := c.s.client.Txn(ctx).
		If(c.s.leaderCmp(), nodeCreatedCmp).
		Then(clientv3.OpPut(storePath, string(storeValue))).
		Commit()
	cancel()
	if err != nil {
		return errors.Trace(err)
	}
	if !resp.Succeeded {
		return errors.Errorf("put store %v fail", store)
	}

	mu.stores[store.GetStoreId()] = *store

	return nil
}

func (c *raftCluster) GetMeta() (*metapb.Cluster, error) {
	mu := &c.mu
	mu.RLock()
	defer mu.RUnlock()

	meta := mu.meta
	return &meta, nil
}

func (c *raftCluster) PutMeta(meta *metapb.Cluster) error {
	if meta.GetClusterId() != c.clusterID {
		return errors.Errorf("invalid cluster %v, mismatch cluster id %d", meta, c.clusterID)
	}

	metaValue, err := proto.Marshal(meta)
	if err != nil {
		return errors.Trace(err)
	}

	mu := &c.mu
	mu.Lock()
	defer mu.Unlock()

	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	resp, err := c.s.client.Txn(ctx).
		If(c.s.leaderCmp()).
		Then(clientv3.OpPut(c.clusterRoot, string(metaValue))).
		Commit()
	cancel()
	if err != nil {
		return errors.Trace(err)
	}
	if !resp.Succeeded {
		return errors.Errorf("put cluster meta %v error", meta)
	}

	mu.meta = *meta
	return nil
}
