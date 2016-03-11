package server

import (
	"fmt"

	"github.com/golang/protobuf/proto"
	"github.com/pingcap/kvproto/pkg/pdpb"
)

// NewError returns a Response with go error.
func NewError(err error) *pdpb.Response {
	r := &pdpb.Response{
		Header: &pdpb.ResponseHeader{},
	}

	r.Header.Error = &pdpb.Error{
		Message: proto.String(err.Error()),
	}

	return r
}

// NewErrorf returns a Response with special format message.
func NewErrorf(format string, args ...interface{}) *pdpb.Response {
	return NewError(fmt.Errorf(format, args...))
}

// NewBootstrappedError returns a BootstrappedError response.
func NewBootstrappedError() *pdpb.Response {
	r := &pdpb.Response{
		Header: &pdpb.ResponseHeader{},
	}

	r.Header.Error = &pdpb.Error{
		Message:      proto.String("cluster is already bootstrapped"),
		Bootstrapped: &pdpb.BootstrappedError{},
	}

	return r
}
