// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package featureflag

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

var (
	ErrFeatureUnsupported = ErrNS.NewType("feature_unsupported")
)

// VersionGuard returns gin.HandlerFunc as guard middleware.
// It will determine if features are available in the target version.
func VersionGuard(version string, featureFlags ...*FeatureFlag) gin.HandlerFunc {
	supported := true
	unsupportedFeatures := make([]string, len(featureFlags))
	for _, ff := range featureFlags {
		if !ff.IsSupported(version) {
			supported = false
			unsupportedFeatures = append(unsupportedFeatures, ff.Name())
			continue
		}
	}

	return func(c *gin.Context) {
		if !supported {
			_ = c.Error(ErrFeatureUnsupported.New("list: %v", unsupportedFeatures))
			c.Status(http.StatusForbidden)
			c.Abort()
			return
		}

		c.Next()
	}
}
