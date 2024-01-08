// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

// Package jsonserde sets default config for json-iterator.
//
// If this package is imported, json-iterator will:
// - encode time as millisecond timestamps
// - encode field names as lower_snake_case
package jsonserde

import (
	"time"

	jsoniter "github.com/json-iterator/go"
	"github.com/json-iterator/go/extra"
)

func init() {
	extra.RegisterTimeAsInt64Codec(time.Millisecond)
	extra.SetNamingStrategy(swagToSnakeCase)
}

var Default = jsoniter.ConfigCompatibleWithStandardLibrary
