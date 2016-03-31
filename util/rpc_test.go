package util

import (
	"bytes"

	"github.com/golang/protobuf/proto"
	. "github.com/pingcap/check"
	"github.com/pingcap/kvproto/pkg/metapb"
)

var _ = Suite(&testRPCSuite{})

type testRPCSuite struct {
}

func (s *testRPCSuite) TestCodec(c *C) {
	var buf bytes.Buffer

	store := metapb.Store{
		Id:      proto.Uint64(2),
		Address: proto.String("127.0.0.0:1"),
	}

	err := WriteMessage(&buf, 1, &store)
	c.Assert(err, IsNil)

	newStore := metapb.Store{}
	msgID, err := ReadMessage(&buf, &newStore)
	c.Assert(err, IsNil)
	c.Assert(msgID, Equals, uint64(1))
	c.Assert(newStore, DeepEquals, store)
}
