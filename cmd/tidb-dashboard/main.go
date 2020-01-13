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
	"flag"
	"fmt"
	"log"
	"net"
	"net/http"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/swaggerserver"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/uiserver"
)

type DashboardCLIConfig struct {
	listenHost string
	listenPort int
}

func main() {
	cliConfig := &DashboardCLIConfig{}
	coreConfig := &config.Config{}

	flag.StringVar(&cliConfig.listenHost, "host", "0.0.0.0", "The listen address of the Dashboard Server")
	flag.IntVar(&cliConfig.listenPort, "port", 12333, "The listen port of the Dashboard Server")
	flag.StringVar(&coreConfig.DataDir, "data-dir", "/tmp/dashboard-data", "Path to the Dashboard Server data directory")
	flag.StringVar(&coreConfig.PDEndPoint, "pd", "http://127.0.0.1:2379", "The PD endpoint that Dashboard Server connects to")
	flag.Parse()

	mux := http.NewServeMux()
	mux.Handle("/dashboard/", http.StripPrefix("/dashboard", uiserver.Handler()))
	mux.Handle("/dashboard/api/", apiserver.Handler("/dashboard/api", coreConfig))
	mux.Handle("/dashboard/api/swagger/", swaggerserver.Handler())

	listenAddr := fmt.Sprintf("%s:%d", cliConfig.listenHost, cliConfig.listenPort)
	listener, err := net.Listen("tcp", listenAddr)
	if err != nil {
		log.Fatal(err)
	}

	log.Printf("Dashboard server is listening at %s\n", listenAddr)
	log.Printf("UI:      http://127.0.0.1:%d/dashboard/\n", cliConfig.listenPort)
	log.Printf("API:     http://127.0.0.1:%d/dashboard/api/\n", cliConfig.listenPort)
	log.Printf("Swagger: http://127.0.0.1:%d/dashboard/api/swagger/\n", cliConfig.listenPort)
	log.Fatal(http.Serve(listener, mux))
}
