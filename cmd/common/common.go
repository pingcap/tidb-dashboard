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

package common

import (
	"crypto/tls"
	"net/url"

	"github.com/pingcap/log"
	"github.com/spf13/cobra"
	"go.etcd.io/etcd/pkg/transport"
	"go.uber.org/zap"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
)

// TODO: refactor tidb-dashboard main.go

type DashboardCLIConfig struct {
	ListenHost     string
	ListenPort     int
	EnableDebugLog bool
	CoreConfig     *config.Config
	// key-visual file mode for debug
	KVFileStartTime int64
	KVFileEndTime   int64
}

func buildTLSConfig(caPath, keyPath, certPath *string) *tls.Config {
	tlsInfo := transport.TLSInfo{
		TrustedCAFile: *caPath,
		KeyFile:       *keyPath,
		CertFile:      *certPath,
	}
	tlsConfig, err := tlsInfo.ClientConfig()
	if err != nil {
		log.Fatal("Failed to load certificates", zap.Error(err))
	}
	return tlsConfig
}

func SetPDEndPoint(coreConfig *config.Config) {
	pdEndPoint, err := url.Parse(coreConfig.PDEndPoint)
	if err != nil {
		log.Fatal("Invalid PD Endpoint", zap.Error(err))
	}
	pdEndPoint.Scheme = "http"
	if coreConfig.ClusterTLSConfig != nil {
		pdEndPoint.Scheme = "https"
	}
	coreConfig.PDEndPoint = pdEndPoint.String()
}

func SetClusterTLS(rootCmd *cobra.Command, coreConfig *config.Config) {
	clusterCaPath := rootCmd.PersistentFlags().String("cluster-ca", "", "path of file that contains list of trusted SSL CAs.")
	clusterCertPath := rootCmd.PersistentFlags().String("cluster-cert", "", "path of file that contains X509 certificate in PEM format.")
	clusterKeyPath := rootCmd.PersistentFlags().String("cluster-key", "", "path of file that contains X509 key in PEM format.")

	// setup TLS config for TiDB components
	if len(*clusterCaPath) != 0 && len(*clusterCertPath) != 0 && len(*clusterKeyPath) != 0 {
		coreConfig.ClusterTLSConfig = buildTLSConfig(clusterCaPath, clusterKeyPath, clusterCertPath)
	}
}
