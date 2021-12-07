// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package featureflag

import (
	"sort"
)

type Registry struct {
	version      string
	flags        []*FeatureFlag
	supportedMap map[string]struct{}
}

func NewRegistry(version string) *Registry {
	return &Registry{
		version:      version,
		flags:        []*FeatureFlag{},
		supportedMap: map[string]struct{}{},
	}
}

// NewRegistryProvider returns a fx.Provider.
func NewRegistryProvider(version string) func() *Registry {
	return func() *Registry {
		return NewRegistry(version)
	}
}

// Register feature flag.
func (m *Registry) Register(name string, constraints ...string) *FeatureFlag {
	f := NewFeatureFlag(name, constraints...)
	m.flags = append(m.flags, f)
	if f.IsSupported(m.version) {
		m.supportedMap[f.Name()] = struct{}{}
	}
	return f
}

// SupportedFeatures returns supported feature's names.
func (m *Registry) SupportedFeatures() []string {
	sf := make([]string, 0, len(m.supportedMap))
	for k := range m.supportedMap {
		sf = append(sf, k)
	}
	sort.Strings(sf)
	return sf
}
