// Copyright 2021 PingCAP, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package virtualview

import (
	"sort"
	"strings"
)

// FilterJSONNamesByColumnNames returns field json names filtered by column names
// This function will return all json names if nil is given
func FilterJSONNamesByColumnNames(vv *VirtualView, columnNames []string) []string {
	jsonNames := []string{}

	if columnNames == nil {
		for _, field := range vv.fullSchema.fields {
			jsonNames = append(jsonNames, field.jsonNameL)
		}
	} else {
		for _, columnName := range columnNames {
			field, ok := vv.fullSchema.fieldByColumnNameL[strings.ToLower(columnName)]
			if !ok {
				continue
			}
			jsonNames = append(jsonNames, field.jsonNameL)
		}
	}

	sort.Strings(jsonNames)
	return jsonNames
}
