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
	table := &tableInOrder{
		tables: []*tableDetail{{ID: 1}, {ID: 2}, {ID: 4}, {ID: 8}},
	}
	require.Equal(t, table.findOne(1, 2).ID, int64(1))
	require.Equal(t, table.findOne(2, 3).ID, int64(2))
	require.Equal(t, table.findOne(3, 5).ID, int64(4))
	require.Equal(t, table.findOne(8, 18).ID, int64(8))
	require.Equal(t, table.findOne(3, 4).ID, int64(4))
	require.Nil(t, table.findOne(8, 0))
	require.Nil(t, table.findOne(8, 8))
	require.Nil(t, table.findOne(80, 81))

	table0 := &tableInOrder{
		tables: []*tableDetail{},
	}
	require.Nil(t, table0.findOne(1, 2))

	table1 := &tableInOrder{
		tables: []*tableDetail{{ID: 2}},
	}
	require.Equal(t, table1.findOne(1, 2).ID, int64(2))
	require.Nil(t, table1.findOne(0, 1))
	require.Nil(t, table1.findOne(3, 4))
}
