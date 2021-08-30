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

package endpoint

import (
	"net/http"
	"net/url"
	"regexp"
	"time"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
)

type Request struct {
	pathSchema string

	Component   model.NodeKind
	Method      Method
	Timeout     time.Duration
	Host        string
	Port        int
	PathValues  url.Values
	QueryValues url.Values
}

func NewRequest(component model.NodeKind, method Method, host string, port int, pathSchema string) *Request {
	return &Request{
		pathSchema:  pathSchema,
		Component:   component,
		Method:      method,
		Host:        host,
		Port:        port,
		PathValues:  url.Values{},
		QueryValues: url.Values{},
	}
}

type Method string

const (
	MethodGet Method = http.MethodGet
)

var pathReplaceRegexp = regexp.MustCompile(`\{(\w+)\}`)

func (r *Request) Path() string {
	path := pathReplaceRegexp.ReplaceAllStringFunc(r.pathSchema, func(s string) string {
		key := pathReplaceRegexp.ReplaceAllString(s, "${1}")
		val := r.PathValues.Get(key)
		return val
	})
	return path
}

func (r *Request) Query() string {
	return r.QueryValues.Encode()
}
