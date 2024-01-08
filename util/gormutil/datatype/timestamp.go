// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package datatype

import (
	"database/sql"
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"gorm.io/gorm/schema"
)

// Timestamp is serialized as microsecond-precision unix timestamps in JSON, and can be mapped to
// the "timestamp" field type in MySQL / TiDB.
// NULL value will be scanned as unix timestamp 0. To distinguish zero timestamp and null timestamp,
// use nullable.Timestamp instead.
//
// This struct is only used for compatibility with existing "timestamp" field types.
// Int should be always preferred to store timestamps wherever possible.
type Timestamp struct {
	time.Time
}

var _ sql.Scanner = (*Timestamp)(nil)

// Scan implements sql.Scanner.
func (n *Timestamp) Scan(value interface{}) error {
	if value == nil {
		n.Time = time.Unix(0, 0)
		return nil
	}
	switch v := value.(type) {
	case time.Time:
		n.Time = v
		return nil
	}
	return fmt.Errorf("can't convert %T to Timestamp", value)
}

var _ schema.GormDataTypeInterface = Timestamp{}

// GormDataType implements schema.GormDataTypeInterface.
func (n Timestamp) GormDataType() string {
	return "TIMESTAMP"
}

var _ driver.Valuer = Timestamp{}

// Value implements driver.Valuer.
func (n Timestamp) Value() (driver.Value, error) {
	return n.Time, nil
}

var _ json.Marshaler = Timestamp{}

// MarshalJSON implements json.Marshaler.
func (n Timestamp) MarshalJSON() ([]byte, error) {
	ts := n.UnixNano() / 1e3
	return []byte(strconv.FormatInt(ts, 10)), nil
}

var _ json.Unmarshaler = (*Timestamp)(nil)

// UnmarshalJSON implements json.Unmarshaler.
func (n *Timestamp) UnmarshalJSON(data []byte) error {
	var ts int64
	if err := json.Unmarshal(data, &ts); err != nil {
		return err
	}
	n.Time = time.Unix(0, ts*1e3)
	return nil
}
