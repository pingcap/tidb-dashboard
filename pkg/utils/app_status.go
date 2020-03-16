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
	"sync/atomic"

	"github.com/gin-gonic/gin"
)

type AppStatus int32

func NewAppStatus() *AppStatus {
	var a AppStatus = 0
	return &a
}

func (s *AppStatus) IsRunning() bool {
	return atomic.LoadInt32((*int32)(s)) != 0
}

func (s *AppStatus) Start() {
	atomic.StoreInt32((*int32)(s), 1)
}

func (s *AppStatus) Stop() {
	atomic.StoreInt32((*int32)(s), 0)
}

func (s *AppStatus) MWHandleStopped(stoppedHandler gin.HandlerFunc) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !s.IsRunning() {
			stoppedHandler(c)
			return
		}
		c.Next()
	}
}
