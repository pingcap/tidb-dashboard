package types

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"strconv"
	"time"
)

// Timestamp is serialized as microsecond-precision unix timestamps in JSON, and can be mapped to
// the "timestamp" field type in MySQL / TiDB.
// NULL value will be scanned as unix timestamp 0. To distinguish zero timestamp and null timestamp,
// use NullableTimestamp instead.
//
// This struct is only used for compatibility with existing "timestamp" field types.
// Int should be always preferred to store timestamps wherever possible.
type Timestamp struct {
	time.Time
}

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
	return fmt.Errorf("can't convert %T to time.Time", value)
}

// GormDataType implements schema.GormDataTypeInterface
func (n Timestamp) GormDataType() string {
	return "TIMESTAMP"
}

// Value implements driver.Valuer.
func (n Timestamp) Value() (driver.Value, error) {
	return n.Time, nil
}

// MarshalJSON implements json.Marshaler.
func (n Timestamp) MarshalJSON() ([]byte, error) {
	ts := n.UnixNano() / 1e3
	return []byte(strconv.FormatInt(ts, 10)), nil
}

// UnmarshalJSON implements json.Unmarshaler.
func (n *Timestamp) UnmarshalJSON(data []byte) error {
	var ts int64
	if err := json.Unmarshal(data, &ts); err != nil {
		return err
	}
	n.Time = time.Unix(0, ts*1e3)
	return nil
}
