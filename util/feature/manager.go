// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package feature

import (
	"fmt"
	"net/http"
	"sort"

	"github.com/gin-gonic/gin"
)

type Manager struct {
	version      string
	flags        []*Flag
	supportedMap map[string]struct{}
}

func NewManager(version string) *Manager {
	return &Manager{
		version:      version,
		flags:        []*Flag{},
		supportedMap: map[string]struct{}{},
	}
}

// NewManagerProvider returns a fx.Provider.
func NewManagerProvider(version string) func() *Manager {
	return func() *Manager {
		return NewManager(version)
	}
}

// Register feature flag.
func (m *Manager) Register(f *Flag) {
	m.flags = append(m.flags, f)
	if f.IsSupported(m.version) {
		m.supportedMap[f.Name] = struct{}{}
	}
}

// SupportedFeatures returns supported feature's names.
func (m *Manager) SupportedFeatures() []string {
	sf := make([]string, 0, len(m.supportedMap))
	for k := range m.supportedMap {
		sf = append(sf, k)
	}
	sort.Strings(sf)
	return sf
}

// Guard returns gin.HandlerFunc as guard middleware.
// It will determine if features are available in the current version.
func (m *Manager) Guard(featureFlags []*Flag) gin.HandlerFunc {
	supported := true
	unsupportedFeatures := make([]string, len(featureFlags))
	for _, ff := range featureFlags {
		if _, ok := m.supportedMap[ff.Name]; !ok {
			supported = false
			unsupportedFeatures = append(unsupportedFeatures, ff.Name)
			continue
		}
	}

	return func(c *gin.Context) {
		if !supported {
			_ = c.Error(fmt.Errorf("unsupported features: %v", unsupportedFeatures))
			c.Status(http.StatusForbidden)
			c.Abort()
			return
		}

		c.Next()
	}
}
