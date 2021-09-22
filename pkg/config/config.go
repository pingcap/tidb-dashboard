// Copyright 2020 PingCAP, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// See the License for the specific language governing permissions and
// limitations under the License.

package config

import (
	"crypto/tls"
	"net/url"
	"strings"
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
	EnableNonRootLogin bool
}

func Default() *Config {
	return &Config{
		DataDir:            "/tmp/dashboard-data",
		TempDir:            "",
		PDEndPoint:         "http://127.0.0.1:2379",
		PublicPathPrefix:   defaultPublicPathPrefix,
		ClusterTLSConfig:   nil,
		TiDBTLSConfig:      nil,
		EnableTelemetry:    true,
		EnableExperimental: false,
		EnableNonRootLogin: true,
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
