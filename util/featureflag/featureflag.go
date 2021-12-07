// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package featureflag

import (
	"strings"

	"github.com/Masterminds/semver"
	"github.com/joomcode/errorx"
)

var (
	ErrNS = errorx.NewNamespace("feature_flag")
)

type FeatureFlag struct {
	name        string
	constraints []string
}

func NewFeatureFlag(name string, constraints ...string) *FeatureFlag {
	return &FeatureFlag{name: name, constraints: constraints}
}

func (f *FeatureFlag) Name() string {
	return f.name
}

// IsSupported checks if a semantic version fits within a set of constraints
// pdVersion, standaloneVersion examples: "v5.2.2", "v5.3.0", "v5.4.0-alpha-xxx", "5.3.0" (semver can handle `v` prefix by itself)
// constraints examples: "~5.2.2", ">= 5.3.0", see semver docs to get more information.
func (f *FeatureFlag) IsSupported(targetVersion string) bool {
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
