// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package model

// SchemaState is the state for schema elements.
type SchemaState byte

const (
	// StateNone means this schema element is absent and can't be used.
	StateNone SchemaState = iota
	// StateDeleteOnly means we can only delete items for this schema element.
	StateDeleteOnly
	// StateWriteOnly means we can use any write operation on this schema element,
	// but outer can't read the changed data.
	StateWriteOnly
	// StateWriteReorganization means we are re-organizing whole data after write only state.
	StateWriteReorganization
	// StateDeleteReorganization means we are re-organizing whole data after delete only state.
	StateDeleteReorganization
	// StatePublic means this schema element is ok for all write and read operations.
	StatePublic
)

// CIStr is case insensitive string.
type CIStr struct {
	O string `json:"O"` // Original string.
	L string `json:"L"` // Lower case string.
}

// DBInfo provides meta data describing a DB.
type DBInfo struct {
	ID    int64       `json:"id"`
	Name  CIStr       `json:"db_name"`
	State SchemaState `json:"state"`
}

// IndexInfo provides meta data describing a DB index.
// It corresponds to the statement `CREATE INDEX Name ON Table (Column);`
// See https://dev.mysql.com/doc/refman/5.7/en/create-index.html
type IndexInfo struct {
	ID   int64 `json:"id"`
	Name CIStr `json:"idx_name"`
}

// PartitionDefinition defines a single partition.
type PartitionDefinition struct {
	ID   int64 `json:"id"`
	Name CIStr `json:"name"`
}

// PartitionInfo provides table partition info.
type PartitionInfo struct {
	// User may already creates table with partition but table partition is not
	// yet supported back then. When Enable is true, write/read need use tid
	// rather than pid.
	Enable      bool                   `json:"enable"`
	Definitions []*PartitionDefinition `json:"definitions"`
}

// TableInfo provides meta data describing a DB table.
type TableInfo struct {
	ID        int64          `json:"id"`
	Name      CIStr          `json:"name"`
	Indices   []*IndexInfo   `json:"index_info"`
	Partition *PartitionInfo `json:"partition"`
	Version   *int64         `json:"version"`
}

// GetPartitionInfo returns the partition information.
func (t *TableInfo) GetPartitionInfo() *PartitionInfo {
	if t.Partition != nil && t.Partition.Enable {
		return t.Partition
	}
	return nil
}
