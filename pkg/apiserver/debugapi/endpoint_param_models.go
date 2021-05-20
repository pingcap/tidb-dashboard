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
// See the License for the specific language governing permissions and
// limitations under the License.

package debugapi

import (
	"fmt"
	"strconv"
)

var EndpointAPIParamModelText EndpointAPIParamModel = EndpointAPIParamModel{
	Type: "text",
}

var EndpointAPIParamModelInt EndpointAPIParamModel = EndpointAPIParamModel{
	Type: "int",
	Transformer: func(value string) (string, error) {
		if _, err := strconv.Atoi(value); err != nil {
			return "", fmt.Errorf("param should be a number")
		}
		return value, nil
	},
}

var EndpointAPIParamModelDB EndpointAPIParamModel = EndpointAPIParamModel{
	Type: "db",
}

var EndpointAPIParamModelTable EndpointAPIParamModel = EndpointAPIParamModel{
	Type: "table",
}

var EndpointAPIParamModelTableID EndpointAPIParamModel = EndpointAPIParamModel{
	Type: "table_id",
}
