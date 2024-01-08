// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package featureflag

import (
	"sort"
)

type Registry struct {
	version           string
	flags             map[string]*FeatureFlag
	supportedFeatures map[string]struct{}
}

func NewRegistry(version string) *Registry {
	return &Registry{
		version:           version,
		flags:             map[string]*FeatureFlag{},
		supportedFeatures: map[string]struct{}{},
	}
}

// Register create and register feature flag to registry.
func (m *Registry) Register(name string, constraints ...string) *FeatureFlag {
	if f, ok := m.flags[name]; ok {
		return f
	}

	nf := newFeatureFlag(name, m.version, constraints...)
	m.flags[name] = nf
	if nf.IsSupported() {
		m.supportedFeatures[nf.Name()] = struct{}{}
	}
	return nf
}

// SupportedFeatures returns supported feature's names.
func (m *Registry) SupportedFeatures() []string {
	sf := make([]string, 0, len(m.supportedFeatures))
	for k := range m.supportedFeatures {
		sf = append(sf, k)
	}
	sort.Strings(sf)
	return sf
}
