package pd

import (
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

// NewClient creates a PD client.
func NewClient(etcdAddrs []string, leaderPath string, clusterID uint64) (*Client, error) {
	log.Infof("[pd] create etcd client with endpoints %v", etcdAddrs)
	etcdClient, err := clientv3.New(clientv3.Config{
		Endpoints:   etcdAddrs,
		DialTimeout: requestTimeout,
	})
	if err != nil {
		return nil, errors.Trace(err)
	}
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
	close(c.quit)
	// Must wait watchLeader done.
	c.wg.Wait()
	c.worker.stop(errors.New("[pd] pd-client closing"))
}

// GetTS get a timestamp from PD.
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

// GetRegion get a region from PD by key.
// The region may expire after split. Caller is responsible for caching and
// take care of region change.
func (c *Client) GetRegion(key []byte) (*metapb.Region, error) {
	req := &regionRequest{
		key:  key,
		done: make(chan error),
	}
	c.workerMutex.RLock()
	c.worker.requests <- req
	c.workerMutex.RUnlock()
	err := <-req.done
	return req.region, err
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
			c.worker.stop(errors.Errorf("[pd] leader change"))
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
