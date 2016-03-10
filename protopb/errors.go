package protopb

import (
	"fmt"

	"github.com/golang/protobuf/proto"
)

// NewError returns a Response with go error.
func NewError(err error) *Response {
	r := &Response{
		Header: &ResponseHeader{},
	}

	r.Header.Error = &Error{
		Message: proto.String(err.Error()),
	}

	return r
}

// NewErrorf returns a Response with special format message.
func NewErrorf(format string, args ...interface{}) *Response {
	return NewError(fmt.Errorf(format, args...))
}

// NewBootstrappedError returns a BootstrappedError response.
func NewBootstrappedError() *Response {
	r := &Response{
		Header: &ResponseHeader{},
	}

	r.Header.Error = &Error{
		Message:      proto.String("cluster is already bootstrapped"),
		Bootstrapped: &BootstrappedError{},
	}

	return r
}
