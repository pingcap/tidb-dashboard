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
	"fmt"
	"net"
	"net/http"
	_ "net/http/pprof" //nolint:gosec
	"sync"

	"github.com/pingcap/log"
	"github.com/spf13/cobra"
	"go.etcd.io/etcd/clientv3"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
	keyvisualinput "github.com/pingcap-incubator/tidb-dashboard/pkg/keyvisual/input"
	keyvisualregion "github.com/pingcap-incubator/tidb-dashboard/pkg/keyvisual/region"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/swaggerserver"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/uiserver"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/utils"
)

var runCmd = &cobra.Command{
	Use:   "run",
	Short: "run tidb dashboard",
	Long:  `run tidb dashboard`,

	Run: func(cmd *cobra.Command, args []string) {
		run(cmd)
	},
}

func run(runCmd *cobra.Command) {
	// Flushing any buffered log entries
	defer log.Sync() //nolint:errcheck

	cliConfig := cfg
	ctx := getContext()

	if cliConfig.EnableDebugLog {
		log.SetLevel(zapcore.DebugLevel)
	}

	listenAddr := fmt.Sprintf("%s:%d", cliConfig.ListenHost, cliConfig.ListenPort)
	listener, err := net.Listen("tcp", listenAddr)
	if err != nil {
		log.Fatal("Dashboard server listen failed", zap.String("addr", listenAddr), zap.Error(err))
	}

	uiserver.RewriteAssetsPublicPath(cliConfig.CoreConfig.PathPrefix)
	s := apiserver.NewService(
		cliConfig.CoreConfig,
		apiserver.StoppedHandler,
		uiserver.AssetFS(),
		func(cfg *config.Config, httpClient *http.Client, etcdClient *clientv3.Client) *keyvisualregion.PDDataProvider {
			return &keyvisualregion.PDDataProvider{
				FileStartTime:  cliConfig.KVFileStartTime,
				FileEndTime:    cliConfig.KVFileEndTime,
				PeriodicGetter: keyvisualinput.NewAPIPeriodicGetter(cliConfig.CoreConfig.PDEndPoint, httpClient),
				EtcdClient:     etcdClient,
			}
		},
	)
	if err := s.Start(ctx); err != nil {
		log.Fatal("Can not start server", zap.Error(err))
	}
	defer s.Stop(context.Background()) //nolint:errcheck

	mux := http.DefaultServeMux
	mux.Handle("/dashboard/", http.StripPrefix("/dashboard", uiserver.Handler(uiserver.AssetFS())))
	mux.Handle("/dashboard/api/", apiserver.Handler(s))
	mux.Handle("/dashboard/api/swagger/", swaggerserver.Handler())

	utils.LogInfo()
	log.Info(fmt.Sprintf("Dashboard server is listening at %s", listenAddr))
	log.Info(fmt.Sprintf("UI:      http://127.0.0.1:%d/dashboard/", cliConfig.ListenPort))
	log.Info(fmt.Sprintf("API:     http://127.0.0.1:%d/dashboard/api/", cliConfig.ListenPort))
	log.Info(fmt.Sprintf("Swagger: http://127.0.0.1:%d/dashboard/api/swagger/", cliConfig.ListenPort))

	srv := &http.Server{Handler: mux}
	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		if err := srv.Serve(listener); err != http.ErrServerClosed {
			log.Error("Server aborted with an error", zap.Error(err))
		}
		wg.Done()
	}()

	<-ctx.Done()
	if err := srv.Shutdown(context.Background()); err != nil {
		log.Error("Can not stop server", zap.Error(err))
	}
	wg.Wait()
	log.Info("Stop dashboard server")
}
