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

package utils

import (
	"context"
	"net/http"
	"sync/atomic"

	"go.uber.org/fx"

	"github.com/gin-gonic/gin"
)

type ServiceStatus int32

func NewServiceStatus() *ServiceStatus {
	return new(ServiceStatus)
}

func (s *ServiceStatus) IsRunning() bool {
	return atomic.LoadInt32((*int32)(s)) != 0
}

func (s *ServiceStatus) Start() {
	atomic.StoreInt32((*int32)(s), 1)
}

func (s *ServiceStatus) Stop() {
	atomic.StoreInt32((*int32)(s), 0)
}

func (s *ServiceStatus) Register(lc fx.Lifecycle) {
	lc.Append(fx.Hook{
		OnStart: func(context.Context) error {
			s.Start()
			return nil
		},
		OnStop: func(context.Context) error {
			s.Stop()
			return nil
		},
	})
}

func (s *ServiceStatus) MWHandleStopped(stoppedHandler gin.HandlerFunc) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !s.IsRunning() {
			stoppedHandler(c)
			c.Abort()
			return
		}
		c.Next()
	}
}

func (s *ServiceStatus) NewStatusAwareHandler(handler http.Handler, stoppedHandler http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !s.IsRunning() {
			stoppedHandler.ServeHTTP(w, r)
			return
		}
		handler.ServeHTTP(w, r)
	})
}
