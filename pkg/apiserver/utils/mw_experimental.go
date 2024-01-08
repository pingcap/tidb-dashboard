// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package utils

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/pingcap/tidb-dashboard/util/rest"
)

func MWForbidByExperimentalFlag(enableExp bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !enableExp {
			c.Status(http.StatusForbidden)
			rest.Error(c, ErrExpNotEnabled.NewWithNoMessage())
			c.Abort()
			return
		}

		c.Next()
	}
}
