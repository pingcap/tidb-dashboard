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

type Middlewarer interface {
	AddMiddleware(handler ...MiddlewareHandler)
	GetMiddlewares() []MiddlewareHandler
}

type MiddlewareHub struct {
	Middlewares []MiddlewareHandler
}

func NewMiddlewareHub() *MiddlewareHub {
	return &MiddlewareHub{Middlewares: []MiddlewareHandler{}}
}

// TODO: middleware context & next
type MiddlewareHandlerFunc func(req *Request) error

func (h MiddlewareHandlerFunc) Handle(req *Request) error {
	return h(req)
}

type MiddlewareHandler interface {
	Handle(req *Request) error
}

func (h *MiddlewareHub) Use(handler ...MiddlewareHandler) {
	h.Middlewares = append(h.Middlewares, handler...)
}
