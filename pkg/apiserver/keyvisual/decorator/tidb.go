// Copyright 2019 PingCAP, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// See the License for the specific language governing permissions and
// limitations under the License.

package decorator

import (
	"context"
	"encoding/hex"
	"fmt"
	"sync"
	"time"

	"go.etcd.io/etcd/clientv3"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/keyvisual/info"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/codec"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
)

type tableDetail struct {
	Name    string
	DB      string
	ID      int64
	Indices map[int64]string
}

type tidbLabelStrategy struct {
	Ctx context.Context

	TableMap    sync.Map
	TidbAddress []string
	EtcdClient  *clientv3.Client
}

// TiDBLabelStrategy implements the LabelStrategy interface. Get Label Information from TiDB.
func TiDBLabelStrategy(cfg *config.Config) LabelStrategy {
	client, err := clientv3.New(clientv3.Config{
		Endpoints:   []string{cfg.PDEndPoint},
		DialTimeout: etcdTimeout,
		TLS:         cfg.TLSConfig,
	})
	if err != nil {
		panic(err)
	}
	s := &tidbLabelStrategy{
		Ctx:        cfg.Ctx,
		EtcdClient: client,
	}
	return s
}

func (s *tidbLabelStrategy) Background() {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()
	for {
		select {
		case <-s.Ctx.Done():
			return
		case <-ticker.C:
			s.updateAddress()
			s.updateMap()
		}
	}
}

// CrossBorder does not allow cross tables or cross indexes within a table.
func (s *tidbLabelStrategy) CrossBorder(startKey, endKey string) bool {
	startBytes, endBytes := codec.Key(info.Bytes(startKey)), codec.Key(info.Bytes(endKey))
	startIsMeta, startTableID := startBytes.MetaOrTable()
	endIsMeta, endTableID := endBytes.MetaOrTable()
	if startIsMeta || endIsMeta {
		return startIsMeta != endIsMeta
	}
	if startTableID != endTableID {
		return true
	}
	startIndex := startBytes.IndexID()
	endIndex := endBytes.IndexID()
	return startIndex != endIndex
}

// Label will parse the ID information of the table and index.
func (s *tidbLabelStrategy) Label(key string) (label LabelKey) {
	keyBytes := info.Bytes(key)
	label.Key = hex.EncodeToString(keyBytes)
	decodeKey := codec.Key(keyBytes)
	isMeta, TableID := decodeKey.MetaOrTable()
	if isMeta {
		label.Labels = append(label.Labels, "meta")
	} else if v, ok := s.TableMap.Load(TableID); ok {
		detail := v.(*tableDetail)
		label.Labels = append(label.Labels, detail.Name)
		if rowID := decodeKey.RowID(); rowID != 0 {
			label.Labels = append(label.Labels, fmt.Sprintf("row_%d", rowID))
		} else if indexID := decodeKey.IndexID(); indexID != 0 {
			label.Labels = append(label.Labels, detail.Indices[indexID])
		}
	} else {
		label.Labels = append(label.Labels, fmt.Sprintf("table_%d", TableID))
		if rowID := decodeKey.RowID(); rowID != 0 {
			label.Labels = append(label.Labels, fmt.Sprintf("row_%d", rowID))
		} else if indexID := decodeKey.IndexID(); indexID != 0 {
			label.Labels = append(label.Labels, fmt.Sprintf("index_%d", indexID))
		}
	}
	return
}
