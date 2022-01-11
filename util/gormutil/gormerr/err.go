// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package gormerr

import (
	"errors"

	"gorm.io/gorm"

	"github.com/pingcap/tidb-dashboard/util/rest"
)

// WrapNotFound wraps the "Record Not Found" error with a standard rest.ErrNotFound.
// For other errors, they remain unchanged.
func WrapNotFound(err error) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return rest.ErrNotFound.WrapWithNoMessage(err)
	}
	return err
}
