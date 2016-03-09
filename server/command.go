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
