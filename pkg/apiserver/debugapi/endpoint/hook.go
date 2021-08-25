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

type HookHandlerFunc func(ctx *Context) error

func (h HookHandlerFunc) Handle(ctx *Context) error {
	return h(ctx)
}

type HookHandler interface {
	Handle(ctx *Context) error
}

type Hook struct {
	handlers []HookHandler
}

func (h *Hook) Handler(handler HookHandler) {
	h.handlers = append(h.handlers, handler)
}

func (h *Hook) HandlerFunc(fun HookHandlerFunc) {
	h.handlers = append(h.handlers, fun)
}

func (h *Hook) Exec(ctx *Context) error {
	for _, handler := range h.handlers {
		err := handler.Handle(ctx)
		if err != nil {
			return err
		}
	}
	return nil
}
