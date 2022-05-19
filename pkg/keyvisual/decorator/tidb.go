// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package decorator

import (
	"context"
	"encoding/hex"
	"fmt"
	"sort"
	"sync"
	"time"

	"go.etcd.io/etcd/clientv3"
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
	tableInOrder  *tableInOrder
	tidbClient    *tidb.Client
	SchemaVersion int64
	TidbAddress   []string
}

type tableInOrder struct {
	rwMu   sync.RWMutex
	tables []*tableDetail
}

// BuildFromTableMap build ordered tables from a table map.
func (inOrder *tableInOrder) buildFromTableMap(m *sync.Map) {
	tables := []*tableDetail{}
	m.Range(func(key, value interface{}) bool {
		t := value.(*tableDetail)
		tables = append(tables, t)
		return true
	})

	sort.Sort(&tableSorter{tables: tables})

	inOrder.rwMu.Lock()
	defer inOrder.rwMu.Unlock()
	inOrder.tables = tables
}

// FindOne will find first table detail which id is between [fromId, toId).
// Returns nil if not found any
func (inOrder *tableInOrder) findOne(fromID, toID int64) *tableDetail {
	if fromID >= toID {
		return nil
	}

	inOrder.rwMu.RLock()
	defer inOrder.rwMu.RUnlock()

	tLen := len(inOrder.tables)
	pivot := tLen / 2
	left := 0
	right := tLen
	for pivot > left {
		prevID := inOrder.tables[pivot-1].ID
		id := inOrder.tables[pivot].ID
		// find approaching id near the fromId
		// table_1 ------- table_3 ------- table_5
		//           	^
		//       search table_2
		// approaching result: table_3
		if prevID < fromID && id >= fromID {
			break
		}

		if id < fromID {
			left = pivot
		} else {
			right = pivot
		}
		pivot = (left + right) / 2
	}

	id := inOrder.tables[pivot].ID
	if id < fromID || id >= toID {
		return nil
	}

	return inOrder.tables[pivot]
}

type tableSorter struct {
	tables []*tableDetail
}

func (ts *tableSorter) Len() int {
	return len(ts.tables)
}

func (ts *tableSorter) Swap(i, j int) {
	ts.tables[i], ts.tables[j] = ts.tables[j], ts.tables[i]
}

func (ts *tableSorter) Less(i, j int) bool {
	return ts.tables[i].ID < ts.tables[j].ID
}

type tidbLabeler struct {
	TableMap     *sync.Map
	tableInOrder *tableInOrder
	Buffer       model.KeyInfoBuffer
}

func (s *tidbLabelStrategy) ReloadConfig(cfg *config.KeyVisualConfig) {}

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
		TableMap:     &s.TableMap,
		tableInOrder: s.tableInOrder,
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
	for i := 1; i < len(keys); i++ {
		labelKeys[i-1] = e.label(keys[i-1], keys[i])
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

func (e *tidbLabeler) label(startKey, endKey string) (label LabelKey) {
	startKeyBytes := region.Bytes(startKey)
	label.Key = hex.EncodeToString(startKeyBytes)
	startKeyInfo, _ := e.Buffer.DecodeKey(startKeyBytes)

	isMeta, startTableID := startKeyInfo.MetaOrTable()
	if isMeta {
		label.Labels = append(label.Labels, "meta")
		return
	}

	var detail *tableDetail
	if v, ok := e.TableMap.Load(startTableID); ok {
		detail = v.(*tableDetail)
		label.Labels = append(label.Labels, detail.DB, detail.Name)
	} else {
		endKeyBytes := region.Bytes(endKey)
		endKeyInfo, _ := e.Buffer.DecodeKey(endKeyBytes)
		_, endTableID := endKeyInfo.MetaOrTable()
		detail := e.tableInOrder.findOne(startTableID, endTableID)

		if detail != nil {
			label.Labels = append(label.Labels, detail.DB, detail.Name)
			// can't find the row/index info if the table info was came from a range
			return
		}
		label.Labels = append(label.Labels, fmt.Sprintf("table_%d", startTableID))
	}

	if isCommonHandle, rowID := startKeyInfo.RowInfo(); isCommonHandle {
		label.Labels = append(label.Labels, "row")
	} else if rowID != 0 {
		label.Labels = append(label.Labels, fmt.Sprintf("row_%d", rowID))
	} else if indexID := startKeyInfo.IndexInfo(); indexID != 0 {
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
