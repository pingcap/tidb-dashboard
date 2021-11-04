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
	"net/http"

	"github.com/gin-gonic/gin"
)

func MWForbidByFeatureEnable(enabled bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !enabled {
			_ = c.Error(ErrFeatureNotEnabled.New("The feature is not enabled"))
			c.Status(http.StatusForbidden)
			c.Abort()
			return
		}

		c.Next()
	}
}
