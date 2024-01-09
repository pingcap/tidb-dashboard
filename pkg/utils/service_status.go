// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package utils

import (
	"context"
	"net/http"
	"sync/atomic"

	"github.com/gin-gonic/gin"
	"go.uber.org/fx"
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
		OnStart: func(ctx context.Context) error {
			select {
			case <-ctx.Done():
				return ctx.Err()
			default:
				s.Start()
				return nil
			}
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
