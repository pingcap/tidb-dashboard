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
	"fmt"
	"strings"

	_ "net/http/pprof" //nolint:gosec
	"net/url"
	"os"

	"github.com/pingcap/log"
	"github.com/spf13/cobra"
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

func processPdEndPoint(cfg *DashboardCLIConfig) {
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
}

func init() {
	cfg.CoreConfig = &config.Config{}
	rootCmd.Version = utils.ReleaseVersion
	initRunCmd(rootCmd)
	initKvAuthCmd(rootCmd)
}
