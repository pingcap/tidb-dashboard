package server

import (
	"bufio"
	"encoding/binary"
	"io"
	"net"

	"github.com/golang/protobuf/proto"
	"github.com/ngaut/log"

	"github.com/pingcap/pd/protopb"
)

const (
	readBufferSize         = 8 * 1024
	writeBufferSize        = 8 * 1024
	msgHeaderSize          = 16
	msgVersion      uint16 = 1
	msgMagic        uint16 = 0xdaf4
)

type conn struct {
	s *Server

	rb   *bufio.Reader
	wb   *bufio.Writer
	conn net.Conn
}

func newConn(s *Server, netConn net.Conn) *conn {
	c := &conn{
		s:    s,
		rb:   bufio.NewReaderSize(netConn, readBufferSize),
		wb:   bufio.NewWriterSize(netConn, writeBufferSize),
		conn: netConn,
	}

	s.connsLock.Lock()
	s.conns[c] = struct{}{}
	s.connsLock.Unlock()

	return c
}

func (c *conn) run() {
	defer func() {
		c.s.wg.Done()
		c.Close()
	}()

	for {
		// The RPC format is header + protocol buffer body
		// Header is 16 bytes, format:
		//  | 0xdaf4(2 bytes magic value) | 0x01(version 2 bytes) | msg_len(4 bytes) | msg_id(8 bytes) |,
		// all use bigendian.
		header := make([]byte, msgHeaderSize)
		_, err := io.ReadFull(c.rb, header)
		if err != nil {
			log.Errorf("read msg header err %s", err)
			return
		}

		if magic := binary.BigEndian.Uint16(header[0:2]); magic != msgMagic {
			log.Errorf("mismatch header magic %x != %x", magic, msgMagic)
			return
		}

		// skip version now.

		msgLen := binary.BigEndian.Uint32(header[4:8])
		msgID := binary.BigEndian.Uint64(header[8:])

		body := make([]byte, msgLen)
		_, err = io.ReadFull(c.rb, body)
		if err != nil {
			log.Errorf("read msg body err %s", err)
			return
		}

		request := &protopb.Request{}
		err = proto.Unmarshal(body, request)
		if err != nil {
			log.Errorf("decode msg body err %s", err)
			return
		}

		response, err := c.handleRequest(request)
		if err != nil {
			log.Errorf("handle request %s err %v", request, err)
			response = protopb.NewError(err)
		}

		if response == nil {
			// we don't need to response, maybe error?
			// if error, we will return an error response later.
			log.Warnf("empty response")
			continue
		}

		updateResponse(request, response)

		body, err = proto.Marshal(response)
		if err != nil {
			log.Errorf("encode response err %s, close connection", err)
			return
		}

		binary.BigEndian.PutUint16(header[0:2], msgMagic)
		binary.BigEndian.PutUint16(header[2:4], msgVersion)
		binary.BigEndian.PutUint32(header[4:8], uint32(len(body)))
		binary.BigEndian.PutUint64(header[8:16], msgID)

		_, err = c.wb.Write(header)
		if err != nil {
			log.Errorf("write msg header err %s", err)
			return
		}

		_, err = c.wb.Write(body)
		if err != nil {
			log.Errorf("write msg body err %s", err)
			return
		}
	}
}

func updateResponse(req *protopb.Request, resp *protopb.Response) {
	// We can use request field directly here.
	resp.CmdType = req.CmdType

	if req.Header == nil {
		return
	}

	if resp.Header == nil {
		resp.Header = &protopb.ResponseHeader{}
	}

	resp.Header.Uuid = req.Header.Uuid
	resp.Header.ClusterId = req.Header.ClusterId
}

func (c *conn) Close() {
	c.conn.Close()
	c.s.connsLock.Lock()
	delete(c.s.conns, c)
	c.s.connsLock.Unlock()
}

func (c *conn) handleRequest(req *protopb.Request) (*protopb.Response, error) {
	return nil, nil
}
