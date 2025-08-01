// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package featureflag

import (
	"net/http"
	"strings"

	"github.com/Masterminds/semver"
	"github.com/gin-gonic/gin"
	"github.com/joomcode/errorx"

	"github.com/pingcap/tidb-dashboard/util/rest"
)

var ErrFeatureUnsupported = errorx.CommonErrors.NewType("feature_unsupported")

type FeatureFlag struct {
	name        string
	constraints []string
	isSupported bool
}

func newFeatureFlag(name, targetVersion string, constraints ...string) *FeatureFlag {
	f := &FeatureFlag{name: name, constraints: constraints}
	f.isSupported = f.isSupportedIn(targetVersion)
	return f
}

func (f *FeatureFlag) Name() string {
	return f.name
}

func (f *FeatureFlag) IsSupported() bool {
	return f.isSupported
}

// VersionGuard returns gin.HandlerFunc as guard middleware.
// It will determine if features are available in the target version.
func (f *FeatureFlag) VersionGuard() gin.HandlerFunc {
	return func(c *gin.Context) {
		if !f.isSupported {
			rest.Error(c, ErrFeatureUnsupported.New(f.name).WithProperty(rest.HTTPCodeProperty(http.StatusForbidden)))
			c.Abort()
			return
		}

		c.Next()
	}
}

// IsSupportedIn checks if a semantic version fits within a set of constraints
// pdVersion, standaloneVersion examples: "v5.2.2", "v5.3.0", "v5.4.0-alpha-xxx", "5.3.0" (semver can handle `v` prefix by itself)
// constraints examples: "~5.2.2", ">= 5.3.0", see semver docs to get more information.
func (f *FeatureFlag) isSupportedIn(targetVersion string) bool {
	// drop "-alpha-xxx" suffix
	versionWithoutSuffix := strings.Split(targetVersion, "-")[0]
	v, err := semver.NewVersion(versionWithoutSuffix)
	if err != nil {
		return false
	}
	for _, ver := range f.constraints {
		c, err := semver.NewConstraint(ver)
		if err != nil {
			continue
		}
		if c.Check(v) {
			return true
		}
	}
	return false
}
