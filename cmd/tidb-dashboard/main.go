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
	"syscall"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/storage"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/swaggerserver"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/uiserver"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/utils"
	"github.com/pingcap/log"
	"go.uber.org/zap"
)

type DashboardCLIConfig struct {
	Version    bool
	ListenHost string
	ListenPort int
	CoreConfig *config.Config
}

// NewCLIConfig generates the configuration of the dashboard in standalone mode.
func NewCLIConfig() *DashboardCLIConfig {
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

	cfg := &DashboardCLIConfig{
		CoreConfig: &config.Config{
			Ctx:     ctx,
			Version: utils.ReleaseVersion,
		},
	}

	flag.BoolVar(&cfg.Version, "V", false, "Print version information and exit")
	flag.BoolVar(&cfg.Version, "version", false, "Print version information and exit")
	flag.StringVar(&cfg.ListenHost, "host", "0.0.0.0", "The listen address of the Dashboard Server")
	flag.IntVar(&cfg.ListenPort, "port", 32619, "The listen port of the Dashboard Server")
	flag.StringVar(&cfg.CoreConfig.DataDir, "data-dir", "/tmp/dashboard-data", "Path to the Dashboard Server data directory")
	flag.StringVar(&cfg.CoreConfig.PDEndPoint, "pd", "http://127.0.0.1:2379", "The PD endpoint that Dashboard Server connects to")
	flag.Parse()

	if cfg.Version {
		utils.PrintInfo()
		exit(0)
	}

	return cfg
}

func main() {
	cliConfig := NewCLIConfig()
	store := storage.MustOpenDBStore(cliConfig.CoreConfig)
	defer store.Close() //nolint:errcheck

	// Flushing any buffered log entries
	defer log.Sync() //nolint:errcheck

	mux := http.DefaultServeMux
	mux.Handle("/dashboard/", http.StripPrefix("/dashboard", uiserver.Handler()))
	mux.Handle("/dashboard/api/", apiserver.Handler("/dashboard/api", cliConfig.CoreConfig, store))
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
	cliConfig.CoreConfig.Wg.Add(1)
	go func() {
		if err := srv.Serve(listener); err != http.ErrServerClosed {
			log.Fatal("Can not stop server", zap.Error(err))
		}
		cliConfig.CoreConfig.Wg.Done()
	}()

	<-cliConfig.CoreConfig.Ctx.Done()
	if err := srv.Shutdown(context.Background()); err != nil {
		log.Fatal("Can not stop server", zap.Error(err))
	}

	// waiting for other goroutines
	cliConfig.CoreConfig.Wg.Wait()

	log.Info("Stop dashboard server")
}

func exit(code int) {
	log.Sync() //nolint:errcheck
	os.Exit(code)
}
