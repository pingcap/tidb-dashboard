// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package utils

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func MWForbidByFeatureSupport(enabled bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !enabled {
			_ = c.Error(ErrFeatureNotSupported.New("The feature is not supported"))
			c.Status(http.StatusForbidden)
			c.Abort()
			return
		}

		c.Next()
	}
}
