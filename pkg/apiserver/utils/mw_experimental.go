// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package utils

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func MWForbidByExperimentalFlag(enableExp bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !enableExp {
			c.Status(http.StatusForbidden)
			_ = c.Error(ErrExpNotEnabled.NewWithNoMessage())
			c.Abort()
			return
		}

		c.Next()
	}
}
