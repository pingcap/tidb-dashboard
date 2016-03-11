package server

import (
	"github.com/gogo/protobuf/proto"
	"github.com/juju/errors"
	"github.com/pingcap/kvproto/pkg/pdpb"
)

func (c *conn) handleTso(req *pdpb.Request) (*pdpb.Response, error) {
	request := req.GetTso()
	if request == nil {
		return nil, errors.Errorf("invalid tso command, but %v", req)
	}

	tso := &pdpb.TsoResponse{}

	count := request.GetNumber()
	for i := uint32(0); i < count; i++ {
		ts := c.s.getRespTS()
		if ts == nil {
			return nil, errors.Errorf("can not get timestamp")
		}

		tso.Timestamps = append(tso.Timestamps, ts)
	}

	return &pdpb.Response{
		Tso: tso,
	}, nil
}

func (c *conn) handleAllocID(req *pdpb.Request) (*pdpb.Response, error) {
	request := req.GetAllocId()
	if request == nil {
		return nil, errors.Errorf("invalid alloc id command, but %v", req)
	}

	// We can use an allocator for all types ID allocation.
	id, err := c.s.idAlloc.Alloc()
	if err != nil {
		return nil, errors.Trace(err)
	}

	idResp := &pdpb.AllocIdResponse{
		Id: proto.Uint64(id),
	}

	return &pdpb.Response{
		AllocId: idResp,
	}, nil
}

func (c *conn) handleIsBootstrapped(req *pdpb.Request) (*pdpb.Response, error) {
	request := req.GetIsBootstrapped()
	if request == nil {
		return nil, errors.Errorf("invalid is bootstrapped command, but %v", req)
	}

	clusterID := req.GetHeader().GetClusterId()
	cluster, err := c.s.getCluster(clusterID)
	if err != nil {
		return nil, errors.Trace(err)
	}

	resp := &pdpb.IsBootstrappedResponse{
		Bootstrapped: proto.Bool(cluster != nil),
	}

	return &pdpb.Response{
		IsBootstrapped: resp,
	}, nil
}

func (c *conn) handleBootstrap(req *pdpb.Request) (*pdpb.Response, error) {
	request := req.GetBootstrap()
	if request == nil {
		return nil, errors.Errorf("invalid bootstrap command, but %v", req)
	}

	clusterID := req.GetHeader().GetClusterId()
	cluster, err := c.s.getCluster(clusterID)
	if err != nil {
		return nil, errors.Trace(err)
	}

	if cluster != nil {
		return NewBootstrappedError(), nil
	}

	if err = c.s.bootstrapCluster(clusterID, request); err != nil {
		return nil, errors.Trace(err)
	}

	return &pdpb.Response{
		Bootstrap: &pdpb.BootstrapResponse{},
	}, nil
}

func (c *conn) getCluster(req *pdpb.Request) (*raftCluster, error) {
	clusterID := req.GetHeader().GetClusterId()
	cluster, err := c.s.getCluster(clusterID)
	if err != nil {
		return nil, errors.Trace(err)
	} else if cluster == nil {
		return nil, errors.Trace(errClusterNotBootstrapped)
	}
	return cluster, nil
}

func (c *conn) handleGetMeta(req *pdpb.Request) (*pdpb.Response, error) {
	request := req.GetGetMeta()
	if request == nil {
		return nil, errors.Errorf("invalid get meta command, but %v", req)
	}

	cluster, err := c.getCluster(req)
	if err != nil {
		return nil, errors.Trace(err)
	}

	resp := &pdpb.GetMetaResponse{
		MetaType: request.MetaType,
	}

	switch request.GetMetaType() {
	case pdpb.MetaType_NodeType:
		nodeID := request.GetNodeId()
		node, err := cluster.GetNode(nodeID)
		if err != nil {
			return nil, errors.Trace(err)
		}
		// Node may be nil, should we return an error instead of none result?
		resp.Node = node
	case pdpb.MetaType_StoreType:
		storeID := request.GetStoreId()
		store, err := cluster.GetStore(storeID)
		if err != nil {
			return nil, errors.Trace(err)
		}
		// Store may be nil, should we return an error instead of none result?
		resp.Store = store
	case pdpb.MetaType_RegionType:
		key := request.GetRegionKey()
		region, err := cluster.GetRegion(key)
		if err != nil {
			return nil, errors.Trace(err)
		}
		resp.Region = region
	default:
		return nil, errors.Errorf("invalid meta type %v", request.GetMetaType())
	}

	return &pdpb.Response{
		GetMeta: resp,
	}, nil
}

func (c *conn) handlePutMeta(req *pdpb.Request) (*pdpb.Response, error) {
	request := req.GetPutMeta()
	if request == nil {
		return nil, errors.Errorf("invalid put meta command, but %v", req)
	}

	cluster, err := c.getCluster(req)
	if err != nil {
		return nil, errors.Trace(err)
	}

	switch request.GetMetaType() {
	case pdpb.MetaType_NodeType:
		node := request.GetNode()
		if err = cluster.PutNode(node); err != nil {
			return nil, errors.Trace(err)
		}
	case pdpb.MetaType_StoreType:
		store := request.GetStore()
		if err = cluster.PutStore(store); err != nil {
			return nil, errors.Trace(err)
		}
	default:
		return nil, errors.Errorf("invalid meta type %v", request.GetMetaType())
	}

	resp := &pdpb.PutMetaResponse{
		MetaType: request.MetaType,
	}

	return &pdpb.Response{
		PutMeta: resp,
	}, nil
}
