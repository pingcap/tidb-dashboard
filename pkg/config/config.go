// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package config

import (
	"crypto/tls"
	"net/url"
	"strings"

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

	ClusterTLSConfig *tls.Config // TLS config for mTLS authentication between TiDB components.
	TiDBTLSConfig    *tls.Config // TLS config for mTLS authentication between TiDB and MySQL client.

	EnableTelemetry    bool
	EnableExperimental bool
	FeatureVersion     string // assign the target TiDB version when running TiDB Dashboard as standalone mode
}

func Default() *Config {
	// The PDVersion value is "N/A" when running `make && bin/tidb-dashboard`
	// The PDVersion value is "Unknown" when running `go run cmd/tidb-dashboard/main.go`
	featureVersion := version.PDVersion
	if featureVersion == "N/A" || featureVersion == "Unknown" {
		featureVersion = ""
	}
	return &Config{
		DataDir:            "/tmp/dashboard-data",
		TempDir:            "",
		PDEndPoint:         "http://127.0.0.1:2379",
		PublicPathPrefix:   defaultPublicPathPrefix,
		ClusterTLSConfig:   nil,
		TiDBTLSConfig:      nil,
		EnableTelemetry:    true,
		EnableExperimental: false,
		FeatureVersion:     featureVersion,
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
