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
