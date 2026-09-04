// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package config

import (
	"crypto/tls"
	"fmt"
	"net/url"
	"strings"

	"go.etcd.io/etcd/client/pkg/v3/transport"

	"github.com/pingcap/tidb-dashboard/pkg/utils/version"
)

const (
	defaultPublicPathPrefix = "/dashboard"

	UIPathPrefix      = "/dashboard/"
	APIPathPrefix     = "/dashboard/api/"
	SwaggerPathPrefix = "/dashboard/api/swagger/"
)

type Config struct {
	DataDir          string
	TempDir          string
	PDEndPoint       string
	PDEndPoints      []string
	PublicPathPrefix string

	ClusterTLSConfig *tls.Config        // TLS config for mTLS authentication between TiDB components.
	ClusterTLSInfo   *transport.TLSInfo // TLS info for mTLS authentication between TiDB components.
	TiDBTLSConfig    *tls.Config        // TLS config for mTLS authentication between TiDB and MySQL client.

	EnableTelemetry       bool
	EnableExperimental    bool
	EnableKeyVisualizer   bool
	DisableCustomPromAddr bool
	FeatureVersion        string // assign the target TiDB version when running TiDB Dashboard as standalone mode

	NgmTimeout int // in seconds
}

func Default() *Config {
	return &Config{
		DataDir:               "/tmp/dashboard-data",
		TempDir:               "",
		PDEndPoint:            "http://127.0.0.1:2379",
		PublicPathPrefix:      defaultPublicPathPrefix,
		ClusterTLSConfig:      nil,
		ClusterTLSInfo:        nil,
		TiDBTLSConfig:         nil,
		EnableTelemetry:       false,
		EnableExperimental:    false,
		EnableKeyVisualizer:   true,
		DisableCustomPromAddr: false,
		FeatureVersion:        version.PDVersion,
		NgmTimeout:            30, // s
	}
}

func (c *Config) GetClusterHTTPScheme() string {
	if c.ClusterTLSConfig != nil {
		return "https"
	}
	return "http"
}

func (c *Config) GetPDEndPoints() []string {
	if len(c.PDEndPoints) > 0 {
		return c.PDEndPoints
	}
	if c.PDEndPoint != "" {
		return []string{c.PDEndPoint}
	}
	return nil
}

func (c *Config) NormalizePDEndPoint() error {
	rawEndpoints := strings.Split(c.PDEndPoint, ",")
	endpoints := make([]string, 0, len(rawEndpoints))
	for _, item := range rawEndpoints {
		item = strings.TrimSpace(item)
		if item == "" {
			continue
		}

		normalized, err := c.normalizeOnePDEndPoint(item)
		if err != nil {
			return err
		}
		endpoints = append(endpoints, normalized)
	}
	if len(endpoints) == 0 {
		return fmt.Errorf("PD endpoint is empty")
	}

	c.PDEndPoints = endpoints
	c.PDEndPoint = endpoints[0]
	return nil
}

func (c *Config) normalizeOnePDEndPoint(raw string) (string, error) {
	if !strings.HasPrefix(raw, "http://") && !strings.HasPrefix(raw, "https://") {
		raw = "http://" + raw
	}

	pdEndPoint, err := url.Parse(raw)
	if err != nil {
		return "", err
	}

	pdEndPoint.Scheme = c.GetClusterHTTPScheme()
	return pdEndPoint.String(), nil
}

func (c *Config) NormalizePublicPathPrefix() {
	if c.PublicPathPrefix == "" {
		c.PublicPathPrefix = defaultPublicPathPrefix
	}
	c.PublicPathPrefix = strings.TrimRight(c.PublicPathPrefix, "/")
}
