package server

import (
	"path"
	"sync"

	"golang.org/x/net/context"

	"github.com/coreos/etcd/clientv3"
	"github.com/juju/errors"
)

const (
	allocStep = uint64(1000)
)

type idAllocator struct {
	mu   sync.Mutex
	base uint64
	end  uint64

	s *Server
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
	key := alloc.s.getAllocIDPath()
	value, err := getValue(alloc.s.client, key)
	if err != nil {
		return 0, errors.Trace(err)
	}

	var (
		cmp clientv3.Cmp
		end uint64
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
	resp, err := alloc.s.client.Txn(context.TODO()).
		If(alloc.s.leaderCmp(), cmp).
		Then(clientv3.OpPut(key, string(value))).
		Commit()
	if err != nil {
		return 0, errors.Trace(err)
	} else if !resp.Succeeded {
		return 0, errors.New("generate id failed, we may not leader")
	}

	return end, nil
}

func (s *Server) getAllocIDPath() string {
	return path.Join(s.cfg.RootPath, "alloc_id")
}
