// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package decorator

import (
	"context"
	"encoding/hex"
	"fmt"
	"sync"
	"time"

	clientv3 "go.etcd.io/etcd/client/v3"
	"go.uber.org/fx"

	"github.com/pingcap/tidb-dashboard/pkg/config"
	"github.com/pingcap/tidb-dashboard/pkg/keyvisual/region"
	"github.com/pingcap/tidb-dashboard/pkg/tidb"
	"github.com/pingcap/tidb-dashboard/pkg/tidb/model"
)

// TiDBLabelStrategy implements the LabelStrategy interface. It obtains Label Information from TiDB.
func TiDBLabelStrategy(lc fx.Lifecycle, wg *sync.WaitGroup, etcdClient *clientv3.Client, tidbClient *tidb.Client) LabelStrategy {
	s := &tidbLabelStrategy{
		EtcdClient:    etcdClient,
		tidbClient:    tidbClient,
		SchemaVersion: -1,
	}

	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			wg.Add(1)
			go func() {
				defer wg.Done()
				s.Background(ctx)
			}()
			return nil
		},
	})

	return s
}

type tableDetail struct {
	Name    string
	DB      string
	ID      int64
	Indices map[int64]string
}

type tidbLabelStrategy struct {
	Config     *config.Config
	EtcdClient *clientv3.Client

	TableMap      sync.Map
	tidbClient    *tidb.Client
	SchemaVersion int64
	TidbAddress   []string
}

type tidbLabeler struct {
	TableMap *sync.Map
	Buffer   model.KeyInfoBuffer
}

func (s *tidbLabelStrategy) ReloadConfig(_ *config.KeyVisualConfig) {}

func (s *tidbLabelStrategy) Background(ctx context.Context) {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.updateMap(ctx)
		}
	}
}

func (s *tidbLabelStrategy) NewLabeler() Labeler {
	return &tidbLabeler{
		TableMap: &s.TableMap,
	}
}

// CrossBorder does not allow cross tables or cross indexes within a table.
func (e *tidbLabeler) CrossBorder(startKey, endKey string) bool {
	startInfo, _ := e.Buffer.DecodeKey(region.Bytes(startKey))
	startIsMeta, startTableID := startInfo.MetaOrTable()
	startIndex := startInfo.IndexInfo()

	endInfo, _ := e.Buffer.DecodeKey(region.Bytes(endKey))
	endIsMeta, endTableID := endInfo.MetaOrTable()
	endIndex := endInfo.IndexInfo()

	if startIsMeta || endIsMeta {
		return startIsMeta != endIsMeta
	}
	if startTableID != endTableID {
		return true
	}
	return startIndex != endIndex
}

// Label will parse the ID information of the table and index.
func (e *tidbLabeler) Label(keys []string) []LabelKey {
	labelKeys := make([]LabelKey, len(keys))
	for i, key := range keys {
		labelKeys[i] = e.label(key)
	}

	if keys[0] == "" {
		labelKeys[0] = globalStart
	}
	endIndex := len(keys) - 1
	if keys[endIndex] == "" {
		labelKeys[endIndex] = globalEnd
	}

	return labelKeys
}

func (e *tidbLabeler) label(key string) (label LabelKey) {
	keyBytes := region.Bytes(key)
	label.Key = hex.EncodeToString(keyBytes)
	keyInfo, _ := e.Buffer.DecodeKey(keyBytes)

	isMeta, tableID := keyInfo.MetaOrTable()
	if isMeta {
		label.Labels = append(label.Labels, "meta")
		return
	}

	var detail *tableDetail
	if v, ok := e.TableMap.Load(tableID); ok {
		detail = v.(*tableDetail)
		label.Labels = append(label.Labels, detail.DB, detail.Name)
	} else {
		label.Labels = append(label.Labels, fmt.Sprintf("table_%d", tableID))
	}

	if isCommonHandle, rowID := keyInfo.RowInfo(); isCommonHandle {
		label.Labels = append(label.Labels, "row")
	} else if rowID != 0 {
		label.Labels = append(label.Labels, fmt.Sprintf("row_%d", rowID))
	} else if indexID := keyInfo.IndexInfo(); indexID != 0 {
		if detail == nil {
			label.Labels = append(label.Labels, fmt.Sprintf("index_%d", indexID))
		} else if name, ok := detail.Indices[indexID]; ok {
			label.Labels = append(label.Labels, name)
		} else {
			label.Labels = append(label.Labels, fmt.Sprintf("index_%d", indexID))
		}
	}
	return
}

var globalStart = LabelKey{
	Key:    "",
	Labels: []string{"meta"},
}

var globalEnd = LabelKey{
	Key:    "",
	Labels: []string{},
}
