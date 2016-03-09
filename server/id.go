package server

import (
	"sync"

	"golang.org/x/net/context"

	"github.com/coreos/etcd/clientv3"
	"github.com/juju/errors"
	"github.com/ngaut/log"
)

const (
	allocStep     = uint64(1000)
	allocMaxRetry = 10
)

type idAllocator struct {
	mu     sync.Mutex
	base   uint64
	end    uint64
	client *clientv3.Client
	idPath string
}

func (alloc *idAllocator) Alloc() (uint64, error) {
	alloc.mu.Lock()
	defer alloc.mu.Unlock()
	if alloc.base == alloc.end {
		end, err := alloc.generate()
		if err != nil {
			return 0, errors.Trace(err)
		}

		alloc.end = end
		alloc.base = alloc.end - allocStep
	}

	alloc.base++

	return alloc.base, nil
}

func (alloc *idAllocator) generate() (uint64, error) {
	for i := 0; i < allocMaxRetry; i++ {
		key := alloc.idPath
		value, err := getValue(alloc.client, key)
		if err != nil {
			return 0, errors.Trace(err)
		}

		var (
			cmp clientv3.Cmp
			end uint64 = 0
		)

		if value == nil {
			// create the key
			cmp = clientv3.Compare(clientv3.CreatedRevision(key), "=", 0)
		} else {
			// update the key
			end, err = bytesToUint64(value)
			if err != nil {
				return 0, errors.Trace(err)
			}

			cmp = clientv3.Compare(clientv3.Value(key), "=", string(value))
		}

		end += allocStep
		value = uint64ToBytes(end)
		resp, err := alloc.client.Txn(context.TODO()).
			If(cmp).
			Then(clientv3.OpPut(key, string(value))).
			Commit()
		if err != nil {
			return 0, errors.Trace(err)
		} else if !resp.Succeeded {
			log.Warn("generate id failed, other server may generate it at same time, retry")
			continue
		}

		return end, nil
	}

	return 0, errors.New("generate id failed")
}

func newIDAllocator(c *clientv3.Client, idPath string) *idAllocator {
	return &idAllocator{
		client: c,
		idPath: idPath,
	}
}
