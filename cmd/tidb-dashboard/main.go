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

package main

import (
	"context"
	"flag"
	"fmt"
	"net"
	"net/http"
	_ "net/http/pprof" //nolint:gosec
	"os"
	"os/signal"
	"sync"
	"syscall"

	"github.com/pingcap/log"
	"go.etcd.io/etcd/clientv3"
	"go.uber.org/zap"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/dbstore"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/keyvisual"
	keyvisualInput "github.com/pingcap-incubator/tidb-dashboard/pkg/keyvisual/input"
	keyvisualRegion "github.com/pingcap-incubator/tidb-dashboard/pkg/keyvisual/region"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/pd"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/swaggerserver"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/uiserver"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/utils"
)

type DashboardCLIConfig struct {
	Version    bool
	ListenHost string
	ListenPort int
	CoreConfig *config.Config
	// key-visual file mode for debug
	KVFileStartTime int64
	KVFileEndTime   int64
}

// NewCLIConfig generates the configuration of the dashboard in standalone mode.
func NewCLIConfig() *DashboardCLIConfig {
	cfg := &DashboardCLIConfig{}
	cfg.CoreConfig = &config.Config{}
	cfg.CoreConfig.Version = utils.ReleaseVersion

	flag.BoolVar(&cfg.Version, "V", false, "Print version information and exit")
	flag.BoolVar(&cfg.Version, "version", false, "Print version information and exit")
	flag.StringVar(&cfg.ListenHost, "host", "0.0.0.0", "The listen address of the Dashboard Server")
	flag.IntVar(&cfg.ListenPort, "port", 12333, "The listen port of the Dashboard Server")
	flag.StringVar(&cfg.CoreConfig.DataDir, "data-dir", "/tmp/dashboard-data", "Path to the Dashboard Server data directory")
	flag.StringVar(&cfg.CoreConfig.PDEndPoint, "pd", "http://127.0.0.1:2379", "The PD endpoint that Dashboard Server connects to")
	// debug for keyvisual
	// TODO: Hide help information
	flag.Int64Var(&cfg.KVFileStartTime, "keyvis-file-start", 0, "(debug) start time for file range in file mode")
	flag.Int64Var(&cfg.KVFileEndTime, "keyvis-file-end", 0, "(debug) end time for file range in file mode")

	flag.Parse()

	if cfg.Version {
		utils.PrintInfo()
		exit(0)
	}

	// keyvisual
	startTime := cfg.KVFileStartTime
	endTime := cfg.KVFileEndTime
	if startTime != 0 || endTime != 0 {
		// file mode (debug)
		if startTime == 0 || endTime == 0 || startTime >= endTime {
			panic("keyvis-file-start must be smaller than keyvis-file-end, and none of them are 0")
		}
	}

	return cfg
}

func getContext() (context.Context, *sync.WaitGroup) {
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
	wg := &sync.WaitGroup{}
	return ctx, wg
}

func main() {
	// Flushing any buffered log entries
	defer log.Sync() //nolint:errcheck

	cliConfig := NewCLIConfig()
	ctx, wg := getContext()

	store := dbstore.MustOpenDBStore(cliConfig.CoreConfig)
	defer store.Close() //nolint:errcheck

	etcdClient := pd.NewEtcdClient(cliConfig.CoreConfig)

	// key visual
	remoteDataProvider := &keyvisualRegion.PDDataProvider{
		FileStartTime:  cliConfig.KVFileStartTime,
		FileEndTime:    cliConfig.KVFileEndTime,
		PeriodicGetter: keyvisualInput.NewAPIPeriodicGetter(cliConfig.CoreConfig.PDEndPoint),
		GetEtcdClient: func() *clientv3.Client {
			return etcdClient
		},
		Store: store,
	}
	keyvisualService := keyvisual.NewService(ctx, wg, cliConfig.CoreConfig, remoteDataProvider)
	keyvisualService.Start()

	services := &apiserver.Services{
		Store:     store,
		KeyVisual: keyvisualService,
	}
	mux := http.DefaultServeMux
	mux.Handle("/dashboard/", http.StripPrefix("/dashboard", uiserver.Handler()))
	mux.Handle("/dashboard/api/", apiserver.Handler("/dashboard/api", cliConfig.CoreConfig, services))
	mux.Handle("/dashboard/api/swagger/", swaggerserver.Handler())

	listenAddr := fmt.Sprintf("%s:%d", cliConfig.ListenHost, cliConfig.ListenPort)
	listener, err := net.Listen("tcp", listenAddr)
	if err != nil {
		log.Fatal("Dashboard server listen failed", zap.String("addr", listenAddr), zap.Error(err))
		store.Close() //nolint:errcheck
		exit(1)
	}

	utils.LogInfo()
	log.Info(fmt.Sprintf("Dashboard server is listening at %s", listenAddr))
	log.Info(fmt.Sprintf("UI:      http://127.0.0.1:%d/dashboard/", cliConfig.ListenPort))
	log.Info(fmt.Sprintf("API:     http://127.0.0.1:%d/dashboard/api/", cliConfig.ListenPort))
	log.Info(fmt.Sprintf("Swagger: http://127.0.0.1:%d/dashboard/api/swagger/", cliConfig.ListenPort))

	srv := &http.Server{Handler: mux}
	wg.Add(1)
	go func() {
		if err := srv.Serve(listener); err != http.ErrServerClosed {
			log.Fatal("Can not run server", zap.Error(err))
		}
		wg.Done()
	}()

	<-ctx.Done()
	if err := srv.Shutdown(context.Background()); err != nil {
		log.Fatal("Can not stop server", zap.Error(err))
	}

	// waiting for other goroutines
	wg.Wait()

	log.Info("Stop dashboard server")
}

func exit(code int) {
	log.Sync() //nolint:errcheck
	os.Exit(code)
}
