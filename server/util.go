package server

import (
	"encoding/binary"
	"time"

	"github.com/coreos/etcd/clientv3"
	"github.com/juju/errors"
	"golang.org/x/net/context"
)

// a helper function to get value with key from etcd.
func getValue(c *clientv3.Client, key string) ([]byte, error) {
	kv := clientv3.NewKV(c)

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	resp, err := kv.Get(ctx, key)
	cancel()

	if err != nil {
		return nil, errors.Trace(err)
	}

	if n := len(resp.Kvs); n == 0 {
		return nil, nil
	} else if n > 1 {
		return nil, errors.Errorf("invalid get value resp %v, must only one", resp.Kvs)
	}

	return resp.Kvs[0].Value, nil
}

func bytesToUint64(b []byte) (uint64, error) {
	if len(b) != 8 {
		return 0, errors.Errorf("invalid data, must 8 bytes, but %d", len(b))
	}

	return binary.BigEndian.Uint64(b), nil
}

func uint64ToBytes(v uint64) []byte {
	b := make([]byte, 8)
	binary.BigEndian.PutUint64(b, v)
	return b
}
