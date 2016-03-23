package pd

import (
	"path"
	"sync"
	"time"

	"github.com/coreos/etcd/clientv3"
	"github.com/golang/protobuf/proto"
	"github.com/juju/errors"
	"github.com/ngaut/log"
	"github.com/pingcap/kvproto/pkg/metapb"
	"github.com/pingcap/kvproto/pkg/pdpb"
	"golang.org/x/net/context"
)

const requestTimeout = 3 * time.Second

// Client is a PD (Placement Driver) client.
// It should not be used after calling Close().
type Client struct {
	clusterID   uint64
	etcdClient  *clientv3.Client
	workerMutex sync.RWMutex
	worker      *rpcWorker
	wg          sync.WaitGroup
	quit        chan struct{}
}

func getLeaderPath(rootPath string) string {
	return path.Join(rootPath, "leader")
}

// NewClient creates a PD client.
func NewClient(etcdAddrs []string, rootPath string, clusterID uint64) (*Client, error) {
	log.Infof("[pd] create etcd client with endpoints %v", etcdAddrs)
	etcdClient, err := clientv3.New(clientv3.Config{
		Endpoints:   etcdAddrs,
		DialTimeout: requestTimeout,
	})
	if err != nil {
		return nil, errors.Trace(err)
	}
	leaderPath := getLeaderPath(rootPath)
	leaderAddr, revision, err := getLeader(etcdClient, leaderPath)
	if err != nil {
		return nil, errors.Trace(err)
	}

	client := &Client{
		clusterID:  clusterID,
		etcdClient: etcdClient,
		worker:     newRPCWorker(leaderAddr, clusterID),
		quit:       make(chan struct{}),
	}

	client.wg.Add(1)
	go client.watchLeader(leaderPath, revision)

	return client, nil
}

// Close stops the client.
func (c *Client) Close() {
	c.etcdClient.Close()

	close(c.quit)
	// Must wait watchLeader done.
	c.wg.Wait()
	c.worker.stop(errors.New("[pd] pd-client closing"))
}

// GetTS gets a timestamp from PD.
func (c *Client) GetTS() (int64, int64, error) {
	req := &tsoRequest{
		done: make(chan error),
	}
	c.workerMutex.RLock()
	c.worker.requests <- req
	c.workerMutex.RUnlock()
	err := <-req.done
	return req.physical, req.logical, err
}

// GetRegion gets a region from PD by key.
// The region may expire after split. Caller is responsible for caching and
// taking care of region change.
func (c *Client) GetRegion(key []byte) (*metapb.Region, error) {
	req := &metaRequest{
		pbReq: &pdpb.GetMetaRequest{
			MetaType:  pdpb.MetaType_RegionType.Enum(),
			RegionKey: key,
		},
		done: make(chan error),
	}
	c.workerMutex.RLock()
	c.worker.requests <- req
	c.workerMutex.RUnlock()
	err := <-req.done
	if err != nil {
		return nil, errors.Trace(err)
	}
	region := req.pbResp.GetRegion()
	if region == nil {
		return nil, errors.New("[pd] region field in rpc response not set")
	}
	return region, nil
}

// GetNode gets a node from PD by node id.
// The node may expire later. Caller is responsible for caching and taking care
// of node change.
func (c *Client) GetNode(nodeID uint64) (*metapb.Node, error) {
	req := &metaRequest{
		pbReq: &pdpb.GetMetaRequest{
			MetaType: pdpb.MetaType_NodeType.Enum(),
			NodeId:   proto.Uint64(nodeID),
		},
		done: make(chan error),
	}
	c.workerMutex.RLock()
	c.worker.requests <- req
	c.workerMutex.RUnlock()
	err := <-req.done
	if err != nil {
		return nil, errors.Trace(err)
	}
	node := req.pbResp.GetNode()
	if node == nil {
		return nil, errors.New("[pd] node field in rpc response not set")
	}
	return node, nil
}

func (c *Client) watchLeader(leaderPath string, revision int64) {
	defer c.wg.Done()
WATCH:
	for {
		log.Infof("[pd] start watch pd leader on path %v, revision %v", leaderPath, revision)
		rch := c.etcdClient.Watch(context.Background(), leaderPath)
		select {
		case resp := <-rch:
			if resp.Canceled {
				log.Warn("[pd] leader watcher canceled")
				continue WATCH
			}
			leaderAddr, rev, err := getLeader(c.etcdClient, leaderPath)
			if err != nil {
				log.Warn(err)
				continue WATCH
			}
			log.Infof("[pd] found new pd-server leader addr: %v", leaderAddr)
			c.workerMutex.Lock()
			c.worker.stop(errors.New("[pd] leader change"))
			c.worker = newRPCWorker(leaderAddr, c.clusterID)
			c.workerMutex.Unlock()
			revision = rev
		case <-c.quit:
			return
		}
	}
}

func getLeader(etcdClient *clientv3.Client, path string) (string, int64, error) {
	kv := clientv3.NewKV(etcdClient)
	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	resp, err := kv.Get(ctx, path)
	cancel()
	if err != nil {
		return "", 0, errors.Trace(err)
	}
	if len(resp.Kvs) != 1 {
		return "", 0, errors.Errorf("invalid getLeader resp: %v", resp)
	}

	var leader pdpb.Leader
	if err = proto.Unmarshal(resp.Kvs[0].Value, &leader); err != nil {
		return "", 0, errors.Trace(err)
	}
	return leader.GetAddr(), resp.Header.Revision, nil
}
