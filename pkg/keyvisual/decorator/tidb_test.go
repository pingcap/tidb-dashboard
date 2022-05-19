// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package decorator

import (
	"sync"
	"testing"

	. "github.com/pingcap/check"
	"github.com/stretchr/testify/require"
)

var _ = Suite(&testTiDBSuite{})

type testTiDBSuite struct{}

func TestTableInOrderBuild(t *testing.T) {
	tableMap := sync.Map{}
	tableInOrder := &tableInOrder{}

	tableMap.Store(8, &tableDetail{ID: 8})
	tableMap.Store(2, &tableDetail{ID: 2})
	tableMap.Store(4, &tableDetail{ID: 4})
	tableMap.Store(1, &tableDetail{ID: 1})

	tableInOrder.buildFromTableMap(&tableMap)
	tableIds := make([]int64, 0, len(tableInOrder.tables))
	for _, table := range tableInOrder.tables {
		tableIds = append(tableIds, table.ID)
	}

	require.Equal(t, []int64{1, 2, 4, 8}, tableIds)
}

func TestTableInOrderFindOne(t *testing.T) {
	tableInOrder := &tableInOrder{
		tables: []*tableDetail{{ID: 1}, {ID: 2}, {ID: 4}, {ID: 8}},
	}

	require.Equal(t, tableInOrder.findOne(1, 2).ID, int64(1))
	require.Equal(t, tableInOrder.findOne(2, 3).ID, int64(2))
	require.Equal(t, tableInOrder.findOne(3, 5).ID, int64(4))
	require.Equal(t, tableInOrder.findOne(2, 8).ID, int64(2))
	require.Equal(t, tableInOrder.findOne(8, 18).ID, int64(8))

	require.Nil(t, tableInOrder.findOne(3, 4))
	require.Nil(t, tableInOrder.findOne(8, 0))
	require.Nil(t, tableInOrder.findOne(8, 8))
	require.Nil(t, tableInOrder.findOne(80, 81))
}
