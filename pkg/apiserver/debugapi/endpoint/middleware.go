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

import "github.com/pingcap/tidb-dashboard/pkg/httpc"

type MiddlewareHandlerFunc func(ctx *Context)

func (h MiddlewareHandlerFunc) Handle(ctx *Context) {
	h(ctx)
}

type MiddlewareHandler interface {
	Handle(ctx *Context)
}

type Context struct {
	Request  *Request
	Response *httpc.Response
	Error    error

	index       int
	middlewares []MiddlewareHandler
}

func newContext(req *Request, ms []MiddlewareHandler) *Context {
	return &Context{Request: req, index: -1, middlewares: ms}
}

// We need afterNext callback to check if it has been aborted
// Otherwise, the code after next of the previous recursive call after abort will still execute
//
// afterNext is designed as an optional parameter on purpose
func (c *Context) Next(afterNext ...func() error) {
	c.index++
	if (c.index == len(c.middlewares)) || (c.Error != nil) {
		return
	}

	c.middlewares[c.index].Handle(c)
	// if aborted in recursive calls, should not continue exec afterNext function
	if c.Error != nil || (len(afterNext) == 0) {
		return
	}
	for _, fn := range afterNext {
		err := fn()
		if err != nil {
			c.Abort(err)
		}
	}
}

func (c *Context) Abort(err error) {
	c.Error = err
}
