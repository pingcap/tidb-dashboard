package server

import (
	"github.com/gogo/protobuf/proto"
	"github.com/juju/errors"
	"github.com/pingcap/pd/protopb"
)

func (c *conn) handleTso(req *protopb.Request) (*protopb.Response, error) {
	request := req.GetTso()
	if request == nil {
		return nil, errors.Errorf("invalid tso command, but %v", req)
	}

	tso := &protopb.TsoResponse{}

	count := request.GetNumber()
	for i := uint32(0); i < count; i++ {
		ts := c.s.getRespTS()
		if ts == nil {
			return nil, errors.Errorf("can not get timestamp")
		}

		tso.Timestamps = append(tso.Timestamps, ts)
	}

	return &protopb.Response{
		Tso: tso,
	}, nil
}

func (c *conn) handleAllocID(req *protopb.Request) (*protopb.Response, error) {
	request := req.GetAllocId()
	if request == nil {
		return nil, errors.Errorf("invalid alloc id command, but %v", req)
	}

	// We can use an allocator for all types ID allocation.
	id, err := c.s.idAlloc.Alloc()
	if err != nil {
		return nil, errors.Trace(err)
	}

	idResp := &protopb.AllocIdResponse{
		Id: proto.Uint64(id),
	}

	return &protopb.Response{
		AllocId: idResp,
	}, nil
}

func (c *conn) handleIsBootstrapped(req *protopb.Request) (*protopb.Response, error) {
	request := req.GetIsBootstrapped()
	if request == nil {
		return nil, errors.Errorf("invalid is bootstrapped command, but %v", req)
	}

	clusterID := req.GetHeader().GetClusterId()
	cluster, err := c.s.getCluster(clusterID)
	if err != nil {
		return nil, errors.Trace(err)
	}

	resp := &protopb.IsBootstrappedResponse{
		Bootstrapped: proto.Bool(cluster != nil),
	}

	return &protopb.Response{
		IsBootstrapped: resp,
	}, nil
}

func (c *conn) handleBootstrap(req *protopb.Request) (*protopb.Response, error) {
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
		return protopb.NewBootstrappedError(), nil
	}

	if err = c.s.bootstrapCluster(clusterID, request); err != nil {
		return nil, errors.Trace(err)
	}

	return &protopb.Response{
		Bootstrap: &protopb.BootstrapResponse{},
	}, nil
}

func (c *conn) getCluster(req *protopb.Request) (*raftCluster, error) {
	clusterID := req.GetHeader().GetClusterId()
	cluster, err := c.s.getCluster(clusterID)
	if err != nil {
		return nil, errors.Trace(err)
	} else if cluster == nil {
		return nil, errors.Trace(errClusterNotBootstrapped)
	}
	return cluster, nil
}

func (c *conn) handleGetMeta(req *protopb.Request) (*protopb.Response, error) {
	request := req.GetGetMeta()
	if request == nil {
		return nil, errors.Errorf("invalid get meta command, but %v", req)
	}

	cluster, err := c.getCluster(req)
	if err != nil {
		return nil, errors.Trace(err)
	}

	resp := &protopb.GetMetaResponse{
		MetaType: request.MetaType,
	}

	switch request.GetMetaType() {
	case protopb.MetaType_NodeType:
		nodeID := request.GetNodeId()
		node, err := cluster.GetNode(nodeID)
		if err != nil {
			return nil, errors.Trace(err)
		}
		// Node may be nil, should we return an error instead of none result?
		resp.Node = node
	case protopb.MetaType_StoreType:
		storeID := request.GetStoreId()
		store, err := cluster.GetStore(storeID)
		if err != nil {
			return nil, errors.Trace(err)
		}
		// Store may be nil, should we return an error instead of none result?
		resp.Store = store
	case protopb.MetaType_RegionType:
		key := request.GetRegionKey()
		region, err := cluster.GetRegion(key)
		if err != nil {
			return nil, errors.Trace(err)
		}
		resp.Region = region
	default:
		return nil, errors.Errorf("invalid meta type %v", request.GetMetaType())
	}

	return &protopb.Response{
		GetMeta: resp,
	}, nil
}

func (c *conn) handlePutMeta(req *protopb.Request) (*protopb.Response, error) {
	request := req.GetPutMeta()
	if request == nil {
		return nil, errors.Errorf("invalid put meta command, but %v", req)
	}

	cluster, err := c.getCluster(req)
	if err != nil {
		return nil, errors.Trace(err)
	}

	switch request.GetMetaType() {
	case protopb.MetaType_NodeType:
		node := request.GetNode()
		if err = cluster.PutNode(node); err != nil {
			return nil, errors.Trace(err)
		}
	case protopb.MetaType_StoreType:
		store := request.GetStore()
		if err = cluster.PutStore(store); err != nil {
			return nil, errors.Trace(err)
		}
	default:
		return nil, errors.Errorf("invalid meta type %v", request.GetMetaType())
	}

	resp := &protopb.PutMetaResponse{
		MetaType: request.MetaType,
	}

	return &protopb.Response{
		PutMeta: resp,
	}, nil
}
