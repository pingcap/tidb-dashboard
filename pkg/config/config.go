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
	"fmt"
	"net/url"
	"strings"
)

const (
	DefaultPublicPathPrefix = "/dashboard"

	UIPathPrefix      = "/dashboard/"
	APIPathPrefix     = "/dashboard/api/"
	SwaggerPathPrefix = "/dashboard/api/swagger/"
)

type Config struct {
	DataDir          string
	PDEndPoint       string
	PublicPathPrefix string

	// TLS config for mTLS authentication between TiDB components.
	ClusterTLSConfig *tls.Config

	// TLS config for mTLS authentication between TiDB and MySQL client.
	TiDBTLSConfig *tls.Config

	// Enable client to report data for analysis
	EnableReport bool
}

func (c *Config) NormalizePDEndPoint() error {
	if !strings.HasPrefix(c.PDEndPoint, "http") {
		c.PDEndPoint = fmt.Sprintf("http://%s", c.PDEndPoint)
	}

	pdEndPoint, err := url.Parse(c.PDEndPoint)
	if err != nil {
		return err
	}

	pdEndPoint.Scheme = "http"
	if c.ClusterTLSConfig != nil {
		pdEndPoint.Scheme = "https"
	}

	c.PDEndPoint = pdEndPoint.String()
	return nil
}

func (c *Config) NormalizePublicPathPrefix() {
	if c.PublicPathPrefix == "" {
		c.PublicPathPrefix = DefaultPublicPathPrefix
	}
	c.PublicPathPrefix = strings.TrimRight(c.PublicPathPrefix, "/")
}
