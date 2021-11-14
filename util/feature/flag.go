// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package feature

import (
	"strings"
	"sync"

	"github.com/Masterminds/semver"

	"github.com/pingcap/tidb-dashboard/util/nocopy"
)

type Flag struct {
	nocopy.NoCopy

	Name string

	once        sync.Once
	constraints []string
}

func NewFlag(name string, constraints []string) *Flag {
	return &Flag{Name: name, constraints: constraints}
}

// IsSupported checks if a semantic version fits within a set of constraints
// pdVersion, standaloneVersion examples: "v5.2.2", "v5.3.0", "v5.4.0-alpha-xxx", "5.3.0" (semver can handle `v` prefix by itself)
// constraints examples: "~5.2.2", ">= 5.3.0", see semver docs to get more information.
func (f *Flag) IsSupported(targetVersion string) bool {
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

// Register feature.Flag to feature.Manager, this can be easily used with fx.
// e.g. `fx.Invoke(featureFlag.Register())`.
func (f *Flag) Register() func(m *Manager) {
	return func(m *Manager) {
		f.once.Do(func() {
			m.Register(f)
		})
	}
}
