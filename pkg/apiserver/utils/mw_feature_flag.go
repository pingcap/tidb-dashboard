// Copyright 2021 Suhaha
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

package utils

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/pingcap/tidb-dashboard/util/versionutil"
)

var ErrFeatureNotSupported = ErrNS.NewType("feature_not_supported")

func MWForbidByFeatureFlag(featureFlags []*versionutil.FeatureFlag, targetVersion string) gin.HandlerFunc {
	supported := true
	unsupportedFeatures := make([]string, len(featureFlags))
	for _, ff := range featureFlags {
		if !ff.IsSupported(targetVersion) {
			supported = false
			unsupportedFeatures = append(unsupportedFeatures, ff.Name)
			continue
		}
	}

	return func(c *gin.Context) {
		if !supported {
			_ = c.Error(ErrFeatureNotSupported.New("unsupported features: %v", unsupportedFeatures))
			c.Status(http.StatusForbidden)
			c.Abort()
			return
		}

		c.Next()
	}
}
