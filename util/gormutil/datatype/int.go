// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package datatype

import (
	"database/sql"
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"strconv"

	"gorm.io/gorm/schema"
)

// Int is an alternative type to the standard int type. Int can be mapped to all numeric SQL field types,
// including floats.
// NULL value will be scanned as 0. To distinguish zero and null, use nullable.Int instead.
type Int int

var _ sql.Scanner = (*Int)(nil)

// Scan implements sql.Scanner.
func (n *Int) Scan(value interface{}) error {
	if value == nil {
		*n = 0
		return nil
	}
	switch v := value.(type) {
	case int64:
		*n = Int(v)
		return nil
	case float64:
		*n = Int(v)
		return nil
	case []uint8:
		nv, err := strconv.Atoi(string(v))
		if err == nil {
			*n = Int(nv)
			return nil
		}
		fv, err := strconv.ParseFloat(string(v), 64)
		if err != nil {
			return err
		}
		*n = Int(fv)
		return nil
	}
	return fmt.Errorf("can't convert %T to Int", value)
}

var _ schema.GormDataTypeInterface = Int(0)

// GormDataType implements schema.GormDataTypeInterface.
func (n Int) GormDataType() string {
	return "BIGINT"
}

var _ driver.Valuer = Int(0)

// Value implements driver.Valuer.
func (n Int) Value() (driver.Value, error) {
	return int64(n), nil
}

var _ json.Marshaler = Int(0)

// MarshalJSON implements json.Marshaler.
func (n Int) MarshalJSON() ([]byte, error) {
	return []byte(strconv.FormatInt(int64(n), 10)), nil
}

var _ json.Unmarshaler = (*Int)(nil)

// UnmarshalJSON implements json.Unmarshaler.
func (n *Int) UnmarshalJSON(data []byte) error {
	var v int
	if err := json.Unmarshal(data, &v); err != nil {
		return err
	}
	*n = Int(v)
	return nil
}
