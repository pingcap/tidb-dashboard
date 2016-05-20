package server

import (
	"sync/atomic"

	"github.com/coreos/etcd/clientv3"
	"github.com/golang/protobuf/proto"
	"github.com/juju/errors"
	"github.com/ngaut/log"
	"github.com/pingcap/kvproto/pkg/metapb"
	"github.com/pingcap/kvproto/pkg/msgpb"
	"github.com/pingcap/kvproto/pkg/pdpb"
	"github.com/pingcap/kvproto/pkg/raft_cmdpb"
	"github.com/pingcap/kvproto/pkg/raftpb"
	"github.com/pingcap/kvproto/pkg/util"
	"github.com/twinj/uuid"
)

const (
	maxSendRetry = 10
)

func (c *raftCluster) handleAddPeerReq(region *metapb.Region) (*metapb.Peer, error) {
	peerID, err := c.s.idAlloc.Alloc()
	if err != nil {
		return nil, errors.Trace(err)
	}

	mu := &c.mu
	mu.RLock()
	defer mu.RUnlock()

	// Find a proper store which the region has not in.
	// Now we just choose the first store. Later we will do
	// a better choice.
	//
	// TODO:
	// 1, The stores may be in same machine, so we should choose the best
	// store which the region's current stores are not in. We can use IP to
	// check this.
	// 2, We can check the store statistics and find a low load store.
	// 3, more algorithms...
L:
	for _, store := range mu.stores {
		// we can't add peer in the same store.
		for _, peer := range region.Peers {
			if peer.GetStoreId() == store.GetId() {
				continue L
			}
		}
		return &metapb.Peer{
			Id:      proto.Uint64(peerID),
			StoreId: proto.Uint64(store.GetId()),
		}, nil
	}
	return nil, errors.Errorf("find no store to add peer for region %v", region)
}

// If leader is nil, we will return an error, or else we can remove none leader peer.
func (c *raftCluster) handleRemovePeerReq(region *metapb.Region, leaderID uint64) (*metapb.Peer, error) {
	if len(region.Peers) <= 1 {
		return nil, errors.Errorf("can not remove peer for region %v", region)
	}
	for _, peer := range region.Peers {
		if peer.GetId() != leaderID {
			return peer, nil
		}
	}
	// Maybe we can't enter here.
	return nil, errors.Errorf("find no proper peer to remove for region %v", region)
}

func (c *raftCluster) handleChangePeerReq(region *metapb.Region, leaderID uint64) (*pdpb.ChangePeer, error) {
	clusterMeta, err := c.GetConfig()
	if err != nil {
		return nil, errors.Trace(err)
	}

	var (
		maxPeerNumber = int(clusterMeta.GetMaxPeerNumber())
		regionID      = region.GetId()
		peerNumber    = len(region.GetPeers())
		changeType    raftpb.ConfChangeType
		peer          *metapb.Peer
	)

	if peerNumber == maxPeerNumber {
		log.Infof("region %d peer number equals %d, no need to change peer", regionID, maxPeerNumber)
		return nil, nil
	} else if peerNumber < maxPeerNumber {
		log.Infof("region %d peer number %d < %d, need to add peer", regionID, peerNumber, maxPeerNumber)
		changeType = raftpb.ConfChangeType_AddNode
		if peer, err = c.handleAddPeerReq(region); err != nil {
			return nil, errors.Trace(err)
		}
	} else {
		log.Infof("region %d peer number %d > %d, need to remove peer", regionID, peerNumber, maxPeerNumber)
		changeType = raftpb.ConfChangeType_RemoveNode
		if peer, err = c.handleRemovePeerReq(region, leaderID); err != nil {
			return nil, errors.Trace(err)
		}
	}

	changePeer := &pdpb.ChangePeer{
		ChangeType: changeType.Enum(),
		Peer:       peer,
	}

	return changePeer, nil
}

func (c *raftCluster) maybeChangePeer(request *pdpb.RegionHeartbeatRequest, reqRegion *metapb.Region,
	region *metapb.Region) ([]clientv3.Op, *pdpb.ChangePeer, error) {
	leader := request.GetLeader()
	if leader == nil {
		return nil, nil, errors.Errorf("invalid request leader, %v", request)
	}

	regionEpoch := region.GetRegionEpoch()
	reqRegionEpoch := reqRegion.GetRegionEpoch()

	if reqRegionEpoch.GetConfVer() < regionEpoch.GetConfVer() {
		// If the request epoch configure version is less than the current one, return an error.
		return nil, nil, errors.Errorf("invalid region epoch, request: %v, currenrt: %v", reqRegionEpoch, regionEpoch)
	} else if reqRegionEpoch.GetConfVer() > regionEpoch.GetConfVer() {
		// If the request epoch configure version is greater than the current one, update region meta.
		regionSearchPath := makeRegionSearchKey(c.clusterRoot, reqRegion.GetEndKey())
		regionValue, err := proto.Marshal(reqRegion)
		if err != nil {
			return nil, nil, errors.Trace(err)
		}

		var ops []clientv3.Op
		ops = append(ops, clientv3.OpPut(regionSearchPath, string(regionValue)))
		return ops, nil, nil
	}

	// If the request epoch configure version is equal to the current one, handle change peer request.
	changePeer, err := c.handleChangePeerReq(reqRegion, leader.GetId())
	if err != nil {
		return nil, nil, errors.Trace(err)
	}

	return nil, changePeer, nil
}

func (c *raftCluster) HandleAskSplit(request *pdpb.AskSplitRequest) (*pdpb.AskSplitResponse, error) {
	reqRegion := request.GetRegion()
	startKey := reqRegion.GetStartKey()
	region, err := c.GetRegion(startKey)
	if err != nil {
		return nil, errors.Trace(err)
	}

	// If the request epoch is less than current region epoch, then returns an error.
	reqRegionEpoch := reqRegion.GetRegionEpoch()
	regionEpoch := region.GetRegionEpoch()
	if reqRegionEpoch.GetVersion() < regionEpoch.GetVersion() ||
		reqRegionEpoch.GetConfVer() < regionEpoch.GetConfVer() {
		return nil, errors.Errorf("invalid region epoch, request: %v, currenrt: %v", reqRegionEpoch, regionEpoch)
	}

	newRegionID, err := c.s.idAlloc.Alloc()
	if err != nil {
		return nil, errors.Trace(err)
	}

	peerIDs := make([]uint64, len(request.Region.Peers))
	for i := 0; i < len(peerIDs); i++ {
		if peerIDs[i], err = c.s.idAlloc.Alloc(); err != nil {
			return nil, errors.Trace(err)
		}
	}

	split := &pdpb.AskSplitResponse{
		NewRegionId: proto.Uint64(newRegionID),
		NewPeerIds:  peerIDs,
	}

	return split, nil
}

func (c *raftCluster) maybeSplit(request *pdpb.RegionHeartbeatRequest, reqRegion *metapb.Region,
	region *metapb.Region) ([]clientv3.Op, error) {
	// For split, we should handle heartbeat carefully.
	// E.g, for region 1 [a, c) -> 1 [a, b) + 2 [b, c).
	// after split, region 1 and 2 will do heartbeat independently.
	// We can know that now 1 can be found by region id but 2 is not.
	// So we must process the region range overlapped problem.

	// If the request epoch is less than current region epoch, then returns an error.
	reqRegionEpoch := reqRegion.GetRegionEpoch()
	regionEpoch := region.GetRegionEpoch()
	if reqRegionEpoch.GetVersion() < regionEpoch.GetVersion() {
		// If the request epoch version is less than the current one, return an error.
		return nil, errors.Errorf("invalid region epoch, request: %v, currenrt: %v", reqRegionEpoch, regionEpoch)
	} else if reqRegionEpoch.GetVersion() == regionEpoch.GetVersion() {
		// If the request epoch version is equal to the current one, do nothing.
		return nil, nil
	}

	var ops []clientv3.Op

	regionValue, err := proto.Marshal(reqRegion)
	if err != nil {
		return nil, errors.Trace(err)
	}

	regionEncStartKey := encodeRegionSearchKey(region.GetStartKey())
	regionEncEndKey := encodeRegionSearchKey(region.GetEndKey())
	reqRegionEncStartKey := encodeRegionSearchKey(reqRegion.GetStartKey())
	reqRegionEncEndKey := encodeRegionSearchKey(reqRegion.GetEndKey())
	if reqRegionEncStartKey == regionEncStartKey &&
		reqRegionEncEndKey == regionEncEndKey {
		// Seems there is something wrong? Do nothing.
	} else if regionEncStartKey > reqRegionEncEndKey {
		// No range [start, end) in region now, insert directly.
		reqRegionPath := makeRegionKey(c.clusterRoot, reqRegion.GetId())
		reqSearchKey := makeRegionSearchKey(c.clusterRoot, reqRegion.GetEndKey())
		ops = append(ops, clientv3.OpPut(reqRegionPath, reqRegionEncEndKey))
		ops = append(ops, clientv3.OpPut(reqSearchKey, string(regionValue)))
	} else {
		// Region overlapped, remove old region, insert new one.
		// E.g, 1 [a, c) -> 1 [a, b) + 2 [b, c), either new 1 or 2 reports, the region
		// is overlapped with origin [a, c).
		regionPath := makeRegionKey(c.clusterRoot, region.GetId())
		regionSearchKey := makeRegionSearchKey(c.clusterRoot, region.GetEndKey())
		ops = append(ops, clientv3.OpDelete(regionPath))
		ops = append(ops, clientv3.OpDelete(regionSearchKey))
		reqRegionPath := makeRegionKey(c.clusterRoot, reqRegion.GetId())
		reqSearchKey := makeRegionSearchKey(c.clusterRoot, reqRegion.GetEndKey())
		ops = append(ops, clientv3.OpPut(reqRegionPath, reqRegionEncEndKey))
		ops = append(ops, clientv3.OpPut(reqSearchKey, string(regionValue)))
	}

	return ops, nil
}

func (c *raftCluster) sendRaftCommand(request *raft_cmdpb.RaftCmdRequest, region *metapb.Region) (*raft_cmdpb.RaftCmdResponse, error) {
	originPeer := request.Header.Peer

RETRY:
	for i := 0; i < maxSendRetry; i++ {
		resp, err := c.callCommand(request)
		if err != nil {
			// We may meet some error, maybe network broken, node down, etc.
			// We can check later next time.
			return nil, errors.Trace(err)
		}

		if resp.Header.Error != nil && resp.Header.Error.NotLeader != nil {
			log.Warnf("peer %v is not leader, we got %v", request.Header.Peer, resp.Header.Error)

			leader := resp.Header.Error.NotLeader.Leader
			if leader != nil {
				// The origin peer is not leader and we get the new leader,
				// send this message to the new leader again.
				request.Header.Peer = leader
				continue
			}

			regionID := region.GetId()
			// The origin peer is not leader, but we can't get the leader now,
			// so we try to get the leader in other region peers.
			for _, peer := range region.Peers {
				if peer.GetId() == originPeer.GetId() {
					continue
				}

				leader, err := c.getRegionLeader(regionID, peer)
				if err != nil {
					log.Errorf("get region %d leader err %v", regionID, err)
					continue
				}
				if leader == nil {
					log.Infof("can not get leader for region %d in peer %v", regionID, peer)
					continue
				}

				// We get leader here.
				request.Header.Peer = leader
				continue RETRY
			}
		}

		return resp, nil
	}

	return nil, errors.Errorf("send raft command %v failed", request)
}

func (c *raftCluster) callCommand(request *raft_cmdpb.RaftCmdRequest) (*raft_cmdpb.RaftCmdResponse, error) {
	storeID := request.Header.Peer.GetStoreId()
	store, err := c.GetStore(storeID)
	if err != nil {
		return nil, errors.Trace(err)
	}

	nc, err := c.storeConns.GetConn(store.GetAddress())
	if err != nil {
		return nil, errors.Trace(err)
	}

	msg := &msgpb.Message{
		MsgType: msgpb.MessageType_Cmd.Enum(),
		CmdReq:  request,
	}

	msgID := atomic.AddUint64(&c.s.msgID, 1)
	if err = util.WriteMessage(nc.conn, msgID, msg); err != nil {
		c.storeConns.RemoveConn(store.GetAddress())
		return nil, errors.Trace(err)
	}

	msg.Reset()
	if _, err = util.ReadMessage(nc.conn, msg); err != nil {
		c.storeConns.RemoveConn(store.GetAddress())
		return nil, errors.Trace(err)
	}

	if msg.CmdResp == nil {
		// This is a very serious bug, should we panic here?
		return nil, errors.Errorf("invalid command response message but %v", msg)
	}

	return msg.CmdResp, nil
}

func (c *raftCluster) getRegionDetail(regionID uint64, peer *metapb.Peer) (*raft_cmdpb.RegionDetailResponse, error) {
	request := &raft_cmdpb.RaftCmdRequest{
		Header: &raft_cmdpb.RaftRequestHeader{
			Uuid:     uuid.NewV4().Bytes(),
			RegionId: proto.Uint64(regionID),
			Peer:     peer,
		},
		StatusRequest: &raft_cmdpb.StatusRequest{
			CmdType:      raft_cmdpb.StatusCmdType_RegionDetail.Enum(),
			RegionDetail: &raft_cmdpb.RegionDetailRequest{},
		},
	}

	resp, err := c.callCommand(request)
	if err != nil {
		return nil, errors.Trace(err)
	}

	if resp.StatusResponse != nil && resp.StatusResponse.RegionDetail != nil {
		return resp.StatusResponse.RegionDetail, nil
	}

	return nil, errors.Errorf("get region %d detail failed, got resp %v", regionID, resp)
}

func (c *raftCluster) getRegionLeader(regionID uint64, peer *metapb.Peer) (*metapb.Peer, error) {
	request := &raft_cmdpb.RaftCmdRequest{
		Header: &raft_cmdpb.RaftRequestHeader{
			Uuid:     uuid.NewV4().Bytes(),
			RegionId: proto.Uint64(regionID),
			Peer:     peer,
		},
		StatusRequest: &raft_cmdpb.StatusRequest{
			CmdType:      raft_cmdpb.StatusCmdType_RegionLeader.Enum(),
			RegionLeader: &raft_cmdpb.RegionLeaderRequest{},
		},
	}

	resp, err := c.callCommand(request)
	if err != nil {
		return nil, errors.Trace(err)
	}

	if resp.StatusResponse != nil && resp.StatusResponse.RegionLeader != nil {
		return resp.StatusResponse.RegionLeader.Leader, nil
	}

	return nil, errors.Errorf("get region %d leader failed, got resp %v", regionID, resp)
}
