// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package configuration

import (
	"encoding/json"

	"github.com/pingcap/log"
	"go.uber.org/zap"
)

func flattenRecursive(nestedConfig map[string]interface{}) map[string]interface{} {
	flatMap := make(map[string]interface{})
	flatten(flatMap, nestedConfig, "")
	return flatMap
}

func flatten(flatMap map[string]interface{}, nested interface{}, prefix string) {
	switch n := nested.(type) {
	case map[string]interface{}:
		for k, v := range n {
			path := k
			if prefix != "" {
				path = prefix + "." + k
			}
			flatten(flatMap, v, path)
		}
	case []interface{}:
		// For array, serialize as json string directly
		j, err := json.Marshal(n)
		if err != nil {
			log.Warn("Failed to serialize config value", zap.Any("value", n), zap.Error(err))
			flatMap[prefix] = nil
		} else {
			flatMap[prefix] = string(j)
		}
	case nil:
		flatMap[prefix] = ""
	default: // don't flatten arrays
		flatMap[prefix] = nested
	}
}
