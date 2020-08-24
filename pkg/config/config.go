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
	"os"
	"strings"

	"go.etcd.io/etcd/pkg/transport"
)

const (
	defaultPublicPathPrefix = "/dashboard"

	UIPathPrefix      = "/dashboard/"
	APIPathPrefix     = "/dashboard/api/"
	SwaggerPathPrefix = "/dashboard/api/swagger/"
)

type Config struct {
	DataDir          string
	PDEndPoint       string
	PublicPathPrefix string
	PluginDir        string

	ClusterTLSInfo   transport.TLSInfo
	ClusterTLSConfig *tls.Config // TLS config for mTLS authentication between TiDB components.
	TiDBTLSInfo      transport.TLSInfo
	TiDBTLSConfig    *tls.Config // TLS config for mTLS authentication between TiDB and MySQL client.

	EnableTelemetry    bool
	EnableExperimental bool
}

func BuildTLSConfig(info *transport.TLSInfo) (*tls.Config, error) {
	if info == nil {
		return nil, nil
	}
	// See https://github.com/pingcap/docs/blob/7a62321b3ce9318cbda8697503c920b2a01aeb3d/how-to/secure/enable-tls-clients.md#enable-authentication
	if len(info.TrustedCAFile) == 0 && (len(info.CertFile) == 0 || len(info.KeyFile) == 0) {
		return nil, nil
	}
	return info.ClientConfig()
}

func Default() *Config {
	return &Config{
		DataDir:            "/tmp/dashboard-data",
		PDEndPoint:         "http://127.0.0.1:2379",
		PublicPathPrefix:   defaultPublicPathPrefix,
		ClusterTLSConfig:   nil,
		TiDBTLSConfig:      nil,
		EnableTelemetry:    true,
		EnableExperimental: false,
		PluginDir:          "",
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

// VerifyPluginDir checks whether the plugin directory points to a valid local path.
func (c *Config) VerifyPluginDir() error {
	if len(c.PluginDir) == 0 {
		return nil
	}

	stat, err := os.Stat(c.PluginDir)
	if err != nil {
		return err
	}
	if !stat.IsDir() {
		return fmt.Errorf("%s is not a directory", c.PluginDir)
	}
	return nil
}
