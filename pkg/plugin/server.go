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

// server.go implements the gRPC server boilerplate.

package plugin

import (
	"context"
	"errors"
	"net"
	"net/http"
	"sync/atomic"

	"github.com/hashicorp/go-plugin"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
	"go.etcd.io/etcd/pkg/transport"
)

var handshakeConfig = plugin.HandshakeConfig{
	ProtocolVersion:  1,
	MagicCookieKey:   "TiDB Dashboard Plugin",
	MagicCookieValue: "f47319c4-9dd5-4117-b2b0-5e199fddcd0f",
}

type uiPlugin struct {
	plugin.NetRPCUnsupportedPlugin
	impl UI

	initialized  uint32
	lifecycleCtx context.Context
	destructors  []func(context.Context) error
}

func copyTLSInfo(dest *transport.TLSInfo, src *TLSInfo) {
	if src != nil {
		dest.TrustedCAFile = src.Ca
		dest.CertFile = src.Cert
		dest.KeyFile = src.Key
	}
}

// InitializeUIPlugin implements UIPluginServiceServer.
func (p *uiPlugin) InitializeUIPlugin(ctx context.Context, req *InstallRequest) (*InstallResponse, error) {
	if !atomic.CompareAndSwapUint32(&p.initialized, 0, 1) {
		return nil, errors.New("plugin cannot be initialized twice")
	}

	// populate the registry to provide the config to the plugin.
	registry := UIRegistry{
		serveMux: http.NewServeMux(),
		CoreConfig: &config.Config{
			PDEndPoint:         req.PdEndpoint,
			EnableTelemetry:    req.EnableTelemetry,
			EnableExperimental: req.EnableExperimental,
		},
	}

	copyTLSInfo(&registry.CoreConfig.ClusterTLSInfo, req.ClusterTls)
	copyTLSInfo(&registry.CoreConfig.TiDBTLSInfo, req.TidbTls)

	var err error
	registry.CoreConfig.ClusterTLSConfig, err = config.BuildTLSConfig(&registry.CoreConfig.ClusterTLSInfo)
	if err != nil {
		return nil, err
	}
	registry.CoreConfig.TiDBTLSConfig, err = config.BuildTLSConfig(&registry.CoreConfig.TiDBTLSInfo)
	if err != nil {
		return nil, err
	}

	// execute plugin installation
	if err := p.impl.InstallUI(&registry); err != nil {
		return nil, err
	}

	// run registered start hooks
	for _, hook := range registry.hooks {
		if hook.OnStart != nil {
			if err := hook.OnStart(p.lifecycleCtx); err != nil {
				return nil, err
			}
		}
		if hook.OnStop != nil {
			p.destructors = append(p.destructors, hook.OnStop)
		}
	}

	// run http server
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return nil, err
	}
	server := &http.Server{Handler: registry.serveMux}
	p.destructors = append(p.destructors, server.Shutdown)
	go server.Serve(listener)

	// return
	return &InstallResponse{
		HttpHost: listener.Addr().String(),
	}, nil
}
