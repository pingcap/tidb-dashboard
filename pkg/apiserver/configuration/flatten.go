// Copyright 2020 PingCAP, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// See the License for the specific language governing permissions and
// limitations under the License.

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
