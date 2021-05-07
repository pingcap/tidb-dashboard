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
	"net"
)

var EndpointAPIParamModelText EndpointAPIParamModel = EndpointAPIParamModel{
	Type: "text",
}

var EndpointAPIParamModelIPPort EndpointAPIParamModel = EndpointAPIParamModel{
	Type: "ip_port",
	Transformer: func(value string) (string, error) {
		ip, _, err := net.SplitHostPort(value)
		if err != nil {
			return "", err
		}

		ip2 := net.ParseIP(ip)
		if ip2 == nil {
			return "", fmt.Errorf("invalid ip: %s", value)
		}

		return value, nil
	},
}
