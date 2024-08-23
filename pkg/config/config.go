// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package config

import (
	"crypto/tls"
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

func (c *Config) NormalizePDEndPoint() error {
	if !strings.HasPrefix(c.PDEndPoint, "http://") && !strings.HasPrefix(c.PDEndPoint, "https://") {
		c.PDEndPoint = "http://" + c.PDEndPoint
	}

	pdEndPoint, err := url.Parse(c.PDEndPoint)
	if err != nil {
		return err
	}

	pdEndPoint.Scheme = c.GetClusterHTTPScheme()
	c.PDEndPoint = pdEndPoint.String()
	return nil
}

func (c *Config) NormalizePublicPathPrefix() {
	if c.PublicPathPrefix == "" {
		c.PublicPathPrefix = defaultPublicPathPrefix
	}
	c.PublicPathPrefix = strings.TrimRight(c.PublicPathPrefix, "/")
}
