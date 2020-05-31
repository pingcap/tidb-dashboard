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

// @title Dashboard API
// @version 1.0
// @license.name Apache 2.0
// @license.url http://www.apache.org/licenses/LICENSE-2.0.html
// @BasePath /dashboard/api
// @query.collection.format multi
// @securityDefinitions.apikey JwtAuth
// @in header
// @name Authorization

package main

import (
	"context"
	"crypto/tls"
	"fmt"
	"strings"

	_ "net/http/pprof" //nolint:gosec
	"net/url"
	"os"
	"os/signal"

	"syscall"

	"github.com/pingcap/log"
	"github.com/spf13/cobra"

	"go.etcd.io/etcd/pkg/transport"
	"go.uber.org/zap"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/utils"
)

func main() {
	execute()
}

var cfg = &DashboardCLIConfig{}

var rootCmd = &cobra.Command{
	Use:   "tidb-dashboard",
	Short: "tidb-dashboard",
	Long:  `CLI utility for TiDB Dashboard`,

	Run: func(cmd *cobra.Command, args []string) {
		_ = cmd.Help()
		os.Exit(0)
	},
}

func execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}

type DashboardCLIConfig struct {
	ListenHost     string
	ListenPort     int
	EnableDebugLog bool
	CoreConfig     *config.Config
	// key-visual file mode for debug
	KVFileStartTime int64
	KVFileEndTime   int64
}

func getContext() context.Context {
	ctx, cancel := context.WithCancel(context.Background())
	go func() {
		sc := make(chan os.Signal, 1)
		signal.Notify(sc,
			syscall.SIGHUP,
			syscall.SIGINT,
			syscall.SIGTERM,
			syscall.SIGQUIT)
		<-sc
		cancel()
	}()
	return ctx
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

func setPDEndPoint(coreConfig *config.Config) {
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

func setClusterTLS(rootCmd *cobra.Command, coreConfig *config.Config) {
	clusterCaPath := rootCmd.PersistentFlags().String("cluster-ca", "", "path of file that contains list of trusted SSL CAs.")
	clusterCertPath := rootCmd.PersistentFlags().String("cluster-cert", "", "path of file that contains X509 certificate in PEM format.")
	clusterKeyPath := rootCmd.PersistentFlags().String("cluster-key", "", "path of file that contains X509 key in PEM format.")

	// setup TLS config for TiDB components
	if len(*clusterCaPath) != 0 && len(*clusterCertPath) != 0 && len(*clusterKeyPath) != 0 {
		coreConfig.ClusterTLSConfig = buildTLSConfig(clusterCaPath, clusterKeyPath, clusterCertPath)
	}
}

func init() {
	cfg.CoreConfig = &config.Config{}
	rootCmd.Version = utils.ReleaseVersion

	rootCmd.Flags().StringVar(&cfg.ListenHost, "host", "0.0.0.0", "The listen address of the Dashboard Server")
	rootCmd.Flags().IntVar(&cfg.ListenPort, "port", 12333, "The listen port of the Dashboard Server")
	rootCmd.Flags().StringVar(&cfg.CoreConfig.PathPrefix, "path-prefix", "/dashboard", "Dashboard URL prefix")
	rootCmd.Flags().StringVar(&cfg.CoreConfig.DataDir, "data-dir", "/tmp/dashboard-data", "Path to the Dashboard Server data directory")
	rootCmd.PersistentFlags().StringVar(&cfg.CoreConfig.PDEndPoint, "pd", "http://127.0.0.1:2379", "The PD endpoint that Dashboard Server connects to")
	rootCmd.Flags().BoolVar(&cfg.EnableDebugLog, "debug", false, "Enable debug logs")
	// debug for keyvisual，hide help information
	rootCmd.Flags().Int64Var(&cfg.KVFileStartTime, "keyviz-file-start", 0, "(debug) start time for file range in file mode")
	rootCmd.Flags().Int64Var(&cfg.KVFileEndTime, "keyviz-file-end", 0, "(debug) end time for file range in file mode")

	clusterCaPath := rootCmd.PersistentFlags().String("cluster-ca", "", "path of file that contains list of trusted SSL CAs.")
	clusterCertPath := rootCmd.PersistentFlags().String("cluster-cert", "", "path of file that contains X509 certificate in PEM format.")
	clusterKeyPath := rootCmd.PersistentFlags().String("cluster-key", "", "path of file that contains X509 key in PEM format.")

	tidbCaPath := rootCmd.Flags().String("tidb-ca", "", "path of file that contains list of trusted SSL CAs.")
	tidbCertPath := rootCmd.Flags().String("tidb-cert", "", "path of file that contains X509 certificate in PEM format.")
	tidbKeyPath := rootCmd.Flags().String("tidb-key", "", "path of file that contains X509 key in PEM format.")

	_ = rootCmd.Flags().MarkHidden("keyviz-file-start")
	_ = rootCmd.Flags().MarkHidden("keyviz-file-end")

	// setup TLS config for TiDB components
	if len(*clusterCaPath) != 0 && len(*clusterCertPath) != 0 && len(*clusterKeyPath) != 0 {
		cfg.CoreConfig.ClusterTLSConfig = buildTLSConfig(clusterCaPath, clusterKeyPath, clusterCertPath)
	}

	// setup TLS config for MySQL client
	// See https://github.com/pingcap/docs/blob/7a62321b3ce9318cbda8697503c920b2a01aeb3d/how-to/secure/enable-tls-clients.md#enable-authentication
	if (len(*tidbCertPath) != 0 && len(*tidbKeyPath) != 0) || len(*tidbCaPath) != 0 {
		cfg.CoreConfig.TiDBTLSConfig = buildTLSConfig(tidbCaPath, tidbKeyPath, tidbCertPath)
	}

	// normalize PDEndPoint
	if !strings.HasPrefix(cfg.CoreConfig.PDEndPoint, "http") {
		cfg.CoreConfig.PDEndPoint = fmt.Sprintf("http://%s", cfg.CoreConfig.PDEndPoint)
	}
	pdEndPoint, err := url.Parse(cfg.CoreConfig.PDEndPoint)
	if err != nil {
		log.Fatal("Invalid PD Endpoint", zap.Error(err))
	}
	pdEndPoint.Scheme = "http"
	if cfg.CoreConfig.ClusterTLSConfig != nil {
		pdEndPoint.Scheme = "https"
	}
	cfg.CoreConfig.PDEndPoint = pdEndPoint.String()
	cfg.CoreConfig.PathPrefix = strings.TrimRight(cfg.CoreConfig.PathPrefix, "/")

	// keyvisual
	startTime := cfg.KVFileStartTime
	endTime := cfg.KVFileEndTime
	if startTime != 0 || endTime != 0 {
		// file mode (debug)
		if startTime == 0 || endTime == 0 || startTime >= endTime {
			panic("keyviz-file-start must be smaller than keyviz-file-end, and none of them are 0")
		}
	}

	rootCmd.AddCommand(runCmd)

	rootCmd.AddCommand(kvAuthCmd)
	kvAuthCmd.AddCommand(kvAuthResetCmd)
	kvAuthCmd.AddCommand(kvAuthRevokeCmd)

}
