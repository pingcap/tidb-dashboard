package server

import (
	"strings"
	"sync"

	"golang.org/x/net/context"

	"github.com/coreos/etcd/clientv3"
	"github.com/gogo/protobuf/proto"
	"github.com/juju/errors"
	"github.com/ngaut/log"
	"github.com/pingcap/pd/protopb"
)

const (
	// defaultMaxPeerNumber is the default max peer number for a region.
	defaultMaxPeerNumber = uint32(3)
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
// Operation list, pd can only handle operations like auto-balance, split,
// merge sequentially, and every operation will be assigned a unique incremental ID.
// pending list -> /raft/1/j/1, /raft/1/j/2, value is operation job.
//
// Encode region search key:
//  1, the maximum end region key is empty, so the encode key is \xFF
//  2, other region end key is not empty, the encode key is \z end_key

type raftCluster struct {
	sync.Mutex

	s *Server

	meta        protopb.Cluster
	clusterRoot string

	// node cache
	nodes map[uint64]protopb.Node
	// store cache
	stores map[uint64]protopb.Store
}

func (s *Server) newCluster(clusterID uint64, meta protopb.Cluster) *raftCluster {
	c := &raftCluster{
		s:           s,
		meta:        meta,
		clusterRoot: s.getClusterRootPath(clusterID),
		nodes:       make(map[uint64]protopb.Node),
		stores:      make(map[uint64]protopb.Store),
	}

	return c
}

func (s *Server) getClusterRootPath(clusterID uint64) string {
	return strings.Join(
		[]string{s.cfg.RootPath, "raft", string(uint64ToBytes(clusterID))},
		"/")
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
	} else if value == nil {
		return nil, nil
	}

	m := protopb.Cluster{}
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

	c = s.newCluster(clusterID, m)
	s.clusters[clusterID] = c
	return c, nil
}

func encodeRegionSearchKey(endKey []byte) string {
	if len(endKey) == 0 {
		return "\xFF"
	}

	return string(append([]byte{'z'}, endKey...))
}

func getClusterNodeKey(clusterRootPath string, nodeID uint64) string {
	return strings.Join([]string{clusterRootPath, "n", string(uint64ToBytes(nodeID))}, "/")
}

func getClusterStoreKey(clusterRootPath string, storeID uint64) string {
	return strings.Join([]string{clusterRootPath, "s", string(uint64ToBytes(storeID))}, "/")
}

func getClusterRegionKey(clusterRootPath string, regionID uint64) string {
	return strings.Join([]string{clusterRootPath, "r", string(uint64ToBytes(regionID))}, "/")
}

func getClusterRegionSearchKey(clusterRootPath string, endKey []byte) string {
	return strings.Join([]string{clusterRootPath, "k", encodeRegionSearchKey(endKey)}, "/")
}

func checkBootstrapRequest(clusterID uint64, req *protopb.BootstrapRequest) error {
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
		return errors.Errorf("invalid first region peer number %d, must 1 for bootstrap %d", len(peers), clusterID)
	}

	peer := peers[0]

	if regionMeta.GetMaxPeerId() < peer.GetPeerId() {
		return errors.Errorf("invalid max peer id %d < peer %d for bootstrap %d",
			regionMeta.GetMaxPeerId(), peer.GetPeerId(), clusterID)
	} else if peer.GetNodeId() != nodeMeta.GetNodeId() {
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

func (s *Server) bootstrapCluster(clusterID uint64, req *protopb.BootstrapRequest) error {
	log.Infof("try to bootstrap cluster %d with %v", clusterID, req)

	if err := checkBootstrapRequest(clusterID, req); err != nil {
		return errors.Trace(err)
	}

	var ops []clientv3.Op

	clusterMeta := protopb.Cluster{
		ClusterId:     proto.Uint64(clusterID),
		MaxPeerNumber: proto.Uint32(defaultMaxPeerNumber),
	}

	// Set cluster meta
	clusterValue, err := proto.Marshal(&clusterMeta)
	if err != nil {
		return errors.Trace(err)
	}
	clusterRootPath := s.getClusterRootPath(clusterID)
	ops = append(ops, clientv3.OpPut(clusterRootPath, string(clusterValue)))

	// Set node meta
	nodePath := getClusterNodeKey(clusterRootPath, req.GetNode().GetNodeId())
	nodeValue, err := proto.Marshal(req.GetNode())
	if err != nil {
		return errors.Trace(err)
	}
	ops = append(ops, clientv3.OpPut(nodePath, string(nodeValue)))

	// Set store meta
	for _, storeMeta := range req.GetStores() {
		storePath := getClusterStoreKey(clusterRootPath, storeMeta.GetStoreId())
		storeValue, err1 := proto.Marshal(storeMeta)
		if err1 != nil {
			return errors.Trace(err)
		}
		ops = append(ops, clientv3.OpPut(storePath, string(storeValue)))
	}

	// Set region id -> search key
	regionPath := getClusterRegionKey(clusterRootPath, req.GetRegion().GetRegionId())
	ops = append(ops, clientv3.OpPut(regionPath, encodeRegionSearchKey(req.GetRegion().GetEndKey())))

	// Set region meta with search key
	regionSearchPath := getClusterRegionSearchKey(clusterRootPath, req.GetRegion().GetEndKey())
	regionValue, err := proto.Marshal(req.GetRegion())
	if err != nil {
		return errors.Trace(err)
	}
	ops = append(ops, clientv3.OpPut(regionSearchPath, string(regionValue)))

	bootstrapCmp := clientv3.Compare(clientv3.CreatedRevision(clusterRootPath), "=", 0)
	resp, err := s.client.Txn(context.TODO()).
		If(s.leaderCmp(), bootstrapCmp).
		Then(ops...).
		Commit()
	if err != nil {
		return errors.Trace(err)
	} else if !resp.Succeeded {
		return errors.Errorf("bootstrap cluster %d fail, we may not leader", clusterID)
	}

	log.Infof("bootstrap cluster %d ok", clusterID)

	s.clusterLock.Lock()
	defer s.clusterLock.Unlock()

	if _, ok := s.clusters[clusterID]; ok {
		// We have bootstrapped cluster ok, and another goroutine quickly requests use this
		// so we create the cluster object.
		return nil
	}

	c := s.newCluster(clusterID, clusterMeta)
	c.nodes[req.GetNode().GetNodeId()] = *req.GetNode()
	for _, storeMeta := range req.GetStores() {
		c.stores[storeMeta.GetStoreId()] = *storeMeta
	}

	s.clusters[clusterID] = c

	return nil
}
