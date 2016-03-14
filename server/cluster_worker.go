package server

import (
	"math"
	"math/rand"
	"net"
	"sync/atomic"
	"time"

	"github.com/coreos/etcd/clientv3"
	"github.com/gogo/protobuf/proto"
	"github.com/juju/errors"
	"github.com/ngaut/log"
	"github.com/pingcap/kvproto/pkg/metapb"
	"github.com/pingcap/kvproto/pkg/pd_jobpb"
	"github.com/pingcap/kvproto/pkg/pdpb"
	"github.com/pingcap/kvproto/pkg/raft_cmdpb"
	"github.com/pingcap/kvproto/pkg/raft_serverpb"
	"github.com/pingcap/kvproto/pkg/raftpb"
	"github.com/twinj/uuid"
	"golang.org/x/net/context"
)

const (
	checkJobInterval = 10 * time.Second

	connectTimeout = 3 * time.Second
	readTimeout    = 3 * time.Second
	writeTimeout   = 3 * time.Second
)

func (c *raftCluster) onJobWorker() {
	defer c.wg.Done()

	ticker := time.NewTicker(checkJobInterval)
	defer ticker.Stop()

	for {
		select {
		case <-c.quitCh:
			return
		case <-c.askJobCh:
			if !c.s.IsLeader() {
				log.Warnf("we are not leader, no need to handle job")
				continue
			}

			job, err := c.getFirstJob()
			if err != nil {
				log.Errorf("get first job err %v", err)
			} else if job == nil {
				// no job now, wait
				continue
			}
			if err = c.handleJob(job); err != nil {
				log.Errorf("handle job %v err %v, retry", job, err)
				// wait and force retry
				time.Sleep(time.Second)
				asyncNotify(c.askJobCh)
				continue
			}

			if err = c.popFirstJob(job); err != nil {
				log.Errorf("pop job %v err %v", job, err)
			}

			// Notify to job again.
			asyncNotify(c.askJobCh)
		case <-ticker.C:
			// Try to check job regularly.
			asyncNotify(c.askJobCh)
		}
	}
}

func asyncNotify(ch chan struct{}) {
	select {
	case ch <- struct{}{}:
	default:
	}
}

func (c *raftCluster) postJob(req *raft_cmdpb.RaftCommandRequest) error {
	jobID, err := c.s.idAlloc.Alloc()
	if err != nil {
		return errors.Trace(err)
	}

	req.Header.Uuid = uuid.NewV4().Bytes()

	job := &pd_jobpd.Job{
		JobId:   proto.Uint64(jobID),
		Status:  pd_jobpd.JobStatus_Pending.Enum(),
		Request: req,
	}

	jobValue, err := proto.Marshal(job)
	if err != nil {
		return errors.Trace(err)
	}

	jobPath := makeJobKey(c.clusterRoot, jobID)

	resp, err := c.s.client.Txn(context.TODO()).
		If(c.s.leaderCmp()).
		Then(clientv3.OpPut(jobPath, string(jobValue))).
		Commit()
	if err != nil {
		return errors.Trace(err)
	} else if !resp.Succeeded {
		return errors.Errorf("post job %v fail", job)
	}

	// Tell job worker to handle the job
	asyncNotify(c.askJobCh)

	return nil
}

func (c *raftCluster) getFirstJob() (*pd_jobpd.Job, error) {
	job := pd_jobpd.Job{}

	jobKey := makeJobKey(c.clusterRoot, 0)
	maxJobKey := makeJobKey(c.clusterRoot, math.MaxUint64)

	sortOpt := clientv3.WithSort(clientv3.SortByKey, clientv3.SortAscend)
	ok, err := getProtoMsg(c.s.client, jobKey, &job, clientv3.WithRange(maxJobKey), clientv3.WithLimit(1), sortOpt)
	if err != nil {
		return nil, errors.Trace(err)
	} else if !ok {
		return nil, nil
	}

	return &job, nil
}

func (c *raftCluster) popFirstJob(job *pd_jobpd.Job) error {
	jobKey := makeJobKey(c.clusterRoot, job.GetJobId())
	resp, err := c.s.client.Txn(context.TODO()).
		If(c.s.leaderCmp()).
		Then(clientv3.OpDelete(jobKey)).
		Commit()
	if err != nil {
		return errors.Trace(err)
	} else if !resp.Succeeded {
		return errors.Errorf("pop first job failed")
	}
	return nil
}

func (c *raftCluster) updateJobStatus(job *pd_jobpd.Job, status pd_jobpd.JobStatus) error {
	jobKey := makeJobKey(c.clusterRoot, job.GetJobId())
	job.Status = status.Enum()
	jobValue, err := proto.Marshal(job)
	if err != nil {
		return errors.Trace(err)
	}

	resp, err := c.s.client.Txn(context.TODO()).
		If(c.s.leaderCmp()).
		Then(clientv3.OpPut(jobKey, string(jobValue))).
		Commit()
	if err != nil {
		return errors.Trace(err)
	} else if !resp.Succeeded {
		return errors.Errorf("pop first job failed")
	}
	return nil
}

func (c *raftCluster) handleJob(job *pd_jobpd.Job) error {
	log.Debugf("begin to handle job %v", job)

	// TODO: if the job status is running, check this job whether
	// finished or not in raft server.
	if job.GetStatus() == pd_jobpd.JobStatus_Pending {
		if err := c.updateJobStatus(job, pd_jobpd.JobStatus_Running); err != nil {
			return errors.Trace(err)
		}
	}

	req := job.GetRequest()
	switch req.AdminRequest.GetCmdType() {
	case raft_cmdpb.AdminCommandType_ChangePeer:
		return c.handleChangePeer(job)
	case raft_cmdpb.AdminCommandType_Split:
		return c.handleSplit(job)
	default:
		log.Errorf("invalid job command %v, ignore", req)
		return nil
	}
}

func (c *raftCluster) handleAskChangeAddPeer(region *metapb.Region) (*metapb.Peer, error) {
	peerID, err := c.s.idAlloc.Alloc()
	if err != nil {
		return nil, errors.Trace(err)
	}

	var (
		// The best stores are that the region has not in.
		bestStores []metapb.Store
		// The match stores are that region has not in these stores
		// but in the same node.
		matchStores []metapb.Store
	)

	mu := &c.mu
	mu.RLock()
	defer mu.RUnlock()

	// Find a proper store which the region has not in.
	for _, store := range mu.stores {
		storeID := store.GetStoreId()
		nodeID := store.GetNodeId()

		existNode := false
		existStore := false
		for _, peer := range region.Peers {
			if peer.GetStoreId() == storeID {
				// we can't add peer in the same store.
				existStore = true
				break
			} else if peer.GetNodeId() == nodeID {
				existNode = true
			}
		}

		if existStore {
			continue
		} else if existNode {
			matchStores = append(matchStores, store)
		} else {
			bestStores = append(bestStores, store)
		}
	}

	if len(bestStores) == 0 && len(matchStores) == 0 {
		return nil, errors.Errorf("find no store to add peer for region %v", region)
	}

	var store metapb.Store
	// Select the store randomly, later we will do more better choice.
	if len(bestStores) > 0 {
		store = bestStores[rand.Intn(len(bestStores))]
	} else {
		store = matchStores[rand.Intn(len(matchStores))]
	}

	peer := &metapb.Peer{
		NodeId:  proto.Uint64(store.GetNodeId()),
		StoreId: proto.Uint64(store.GetStoreId()),
		PeerId:  proto.Uint64(peerID),
	}

	return peer, nil
}

// If leader is nil, we can remove any peer in the region, or else we can only remove none leader peer.
func (c *raftCluster) handleAskChangeRemovePeer(region *metapb.Region, leader *metapb.Peer) (*metapb.Peer, error) {
	if len(region.Peers) <= 1 {
		return nil, errors.Errorf("can not remove peer for region %v", region)
	}

	// Now we only remove the first peer, later we will do more better choice.
	if leader == nil {
		return region.Peers[0], nil
	}

	for _, peer := range region.Peers {
		if peer.GetPeerId() != leader.GetPeerId() {
			return peer, nil
		}
	}

	// Maybe we can't enter here.
	return nil, errors.Errorf("find no proper peer to remove for region %v", region)
}

func (c *raftCluster) HandleAskChangePeer(request *pdpb.AskChangePeerRequest) error {
	clusterMeta, err := c.GetMeta()
	if err != nil {
		return errors.Trace(err)
	}

	var (
		maxPeerNumber = int(clusterMeta.GetMaxPeerNumber())
		region        = request.GetRegion()
		regionID      = region.GetRegionId()
		peerNumber    = len(region.GetPeers())
		changeType    raftpb.ConfChangeType
		peer          *metapb.Peer
	)

	if peerNumber == maxPeerNumber {
		log.Infof("region %d peer number equals %d, no need to change peer", regionID, maxPeerNumber)
		return nil
	} else if peerNumber < maxPeerNumber {
		log.Infof("region %d peer number %d < %d, need to add peer", regionID, peerNumber, maxPeerNumber)
		changeType = raftpb.ConfChangeType_AddNode
		if peer, err = c.handleAskChangeAddPeer(region); err != nil {
			return errors.Trace(err)
		}
	} else if peerNumber > maxPeerNumber {
		log.Infof("region %d peer number %d > %d, need to remove peer", regionID, peerNumber, maxPeerNumber)
		changeType = raftpb.ConfChangeType_RemoveNode
		if peer, err = c.handleAskChangeRemovePeer(region, request.Leader); err != nil {
			return errors.Trace(err)
		}
	}

	changePeer := &raft_cmdpb.AdminRequest{
		CmdType: raft_cmdpb.AdminCommandType_ChangePeer.Enum(),
		ChangePeer: &raft_cmdpb.ChangePeerRequest{
			ChangeType: changeType.Enum(),
			Peer:       peer,
		},
	}

	req := &raft_cmdpb.RaftCommandRequest{
		Header: &raft_cmdpb.RaftRequestHeader{
			RegionId: proto.Uint64(regionID),
			Peer:     request.Leader,
		},
		AdminRequest: changePeer,
	}

	return c.postJob(req)
}

func (c *raftCluster) handleChangePeer(job *pd_jobpd.Job) error {
	response, err := c.sendRaftCommand(job.Request)
	if err != nil {
		return errors.Trace(err)
	}

	if response.Header != nil && response.Header.Error != nil {
		log.Errorf("handle %v but failed with response %v, cancel it", job.Request, response.Header.Error)
		return nil
	}

	// Must be change peer response here
	// TODO: check this error later.
	region := response.AdminResponse.ChangePeer.Region

	// Update region
	regionSearchPath := makeRegionSearchKey(c.clusterRoot, region.GetEndKey())
	regionValue, err := proto.Marshal(region)
	if err != nil {
		return errors.Trace(err)
	}

	resp, err := c.s.client.Txn(context.TODO()).
		If(c.s.leaderCmp()).
		Then(clientv3.OpPut(regionSearchPath, string(regionValue))).
		Commit()
	if err != nil {
		return errors.Trace(err)
	} else if !resp.Succeeded {
		return errors.New("update change peer region failed")
	}

	return nil
}

func (c *raftCluster) HandleAskSplit(request *pdpb.AskSplitRequest) error {
	newRegionID, err := c.s.idAlloc.Alloc()
	if err != nil {
		return errors.Trace(err)
	}

	peerIDs := make([]uint64, len(request.Region.Peers))
	for i := 0; i < len(peerIDs); i++ {
		if peerIDs[i], err = c.s.idAlloc.Alloc(); err != nil {
			return errors.Trace(err)
		}
	}

	split := &raft_cmdpb.AdminRequest{
		CmdType: raft_cmdpb.AdminCommandType_Split.Enum(),
		Split: &raft_cmdpb.SplitRequest{
			NewRegionId: proto.Uint64(newRegionID),
			NewPeerIds:  peerIDs,
			SplitKey:    request.SplitKey,
		},
	}

	req := &raft_cmdpb.RaftCommandRequest{
		Header: &raft_cmdpb.RaftRequestHeader{
			RegionId: request.Region.RegionId,
			Peer:     request.Leader,
		},
		AdminRequest: split,
	}

	return c.postJob(req)
}

func (c *raftCluster) handleSplit(job *pd_jobpd.Job) error {
	response, err := c.sendRaftCommand(job.Request)
	if err != nil {
		return errors.Trace(err)
	}

	if response.Header != nil && response.Header.Error != nil {
		log.Errorf("handle %v but failed with response %v, cancel it", job.Request, response.Header.Error)
		return nil
	}

	// Must be split response here
	// TODO: check this error later.
	left := response.AdminResponse.Split.Left
	right := response.AdminResponse.Split.Right

	// Update region
	leftSearchPath := makeRegionSearchKey(c.clusterRoot, left.GetEndKey())
	rightSearchPath := makeRegionSearchKey(c.clusterRoot, right.GetEndKey())

	leftValue, err := proto.Marshal(left)
	if err != nil {
		return errors.Trace(err)
	}

	rightValue, err := proto.Marshal(right)
	if err != nil {
		return errors.Trace(err)
	}

	var ops []clientv3.Op

	leftPath := makeRegionKey(c.clusterRoot, left.GetRegionId())
	rightPath := makeRegionKey(c.clusterRoot, right.GetRegionId())

	ops = append(ops, clientv3.OpPut(leftPath, encodeRegionSearchKey(left.GetEndKey())))
	ops = append(ops, clientv3.OpPut(rightPath, encodeRegionSearchKey(right.GetEndKey())))
	ops = append(ops, clientv3.OpPut(leftSearchPath, string(leftValue)))
	ops = append(ops, clientv3.OpPut(rightSearchPath, string(rightValue)))

	var cmps []clientv3.Cmp
	cmps = append(cmps, c.s.leaderCmp())
	// new left search path must not exist
	cmps = append(cmps, clientv3.Compare(clientv3.CreatedRevision(leftSearchPath), "=", 0))
	// new right search path must exist, because it is the same as origin split path.
	cmps = append(cmps, clientv3.Compare(clientv3.CreatedRevision(rightSearchPath), ">", 0))
	cmps = append(cmps, clientv3.Compare(clientv3.CreatedRevision(rightPath), "=", 0))

	resp, err := c.s.client.Txn(context.TODO()).
		If(cmps...).
		Then(ops...).
		Commit()
	if err != nil {
		return errors.Trace(err)
	} else if !resp.Succeeded {
		return errors.New("update split region failed")
	}

	return nil
}

func (c *raftCluster) sendRaftCommand(request *raft_cmdpb.RaftCommandRequest) (*raft_cmdpb.RaftCommandResponse, error) {
	nodeID := request.Header.Peer.GetNodeId()

	node, err := c.GetNode(nodeID)
	if err != nil {
		return nil, errors.Trace(err)
	}

	// Connect the node.
	// TODO: use connection pool
	conn, err := net.DialTimeout("tcp", node.GetAddress(), connectTimeout)
	if err != nil {
		return nil, errors.Trace(err)
	}

	defer conn.Close()

	msg := &raft_serverpb.Message{
		MsgType: raft_serverpb.MessageType_Command.Enum(),
		CmdReq:  request,
	}

	msgID := atomic.AddUint64(&c.s.msgID, 1)
	if err = writeMessage(conn, msgID, msg); err != nil {
		return nil, errors.Trace(err)
	}

	msg.Reset()
	if _, err = readMessage(conn, msg); err != nil {
		return nil, errors.Trace(err)
	} else if msg.GetMsgType() != raft_serverpb.MessageType_CommandResp {
		return nil, errors.Errorf("need command resp but got %v", msg)
	} else if msg.CmdResp == nil {
		return nil, errors.Errorf("invalid command response message but %v", msg)
	}

	response := msg.CmdResp

	// TODO: check not leader error. if not leader, we should find the leader
	// and re-send the raft command again.

	return response, nil

}
