// Copyright 2016 PingCAP, Inc.
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

package main

import (
	"flag"
	"fmt"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"github.com/juju/errors"
	"github.com/ngaut/log"
	"github.com/pingcap/pd/server"
	"github.com/pingcap/pd/server/api"
)

var (
	config = flag.String("c", "", "config file")

	clusterID           = flag.Uint64("cluster-id", 0, "initial cluster ID for the pd cluster")
	name                = flag.String("name", "pd", "human-readable name for this pd member")
	dataDir             = flag.String("data-dir", "", "path to the data directory (default 'default.{name}')")
	host                = flag.String("host", "127.0.0.1", "host for outer traffic")
	clientPort          = flag.Uint64("client-port", 2379, "port for client traffic")
	advertiseClientPort = flag.Uint64("advertise-client-port", 0, "advertise port for client traffic (default 2379)")
	peerPort            = flag.Uint64("peer-port", 2380, "port for peer traffic")
	advertisePeerPort   = flag.Uint64("advertise-peer-port", 0, "advertise port for peer traffic (default 2380)")
	port                = flag.Uint64("port", 1234, "server port (deprecate later)")
	advertisePort       = flag.Uint64("advertise-port", 0, "advertise server port (deprecate later) (default 1234)")
	httpPort            = flag.Uint64("http-port", 9090, "http port (deprecate later)")
	initialCluster      = flag.String("initial-cluster", "", "initial cluster configuration for bootstrapping (default 'pd=http://127.0.0.1:2380')")
	initialClusterState = flag.String("initial-cluster-state", "new", "initial cluster state ('new' or 'existing')")

	logLevel = flag.String("L", "info", "log level: info, debug, warn, error, fatal")

	maxLeaderCount         = flag.Uint64("max-leader-count", 10, "the max leader region count for choosing store in balance")
	minCapUsedRatio        = flag.Float64("min-capacity-used-ratio", 0.4, "min capacity used ratio for choosing store in balance")
	maxCapUsedRatio        = flag.Float64("max-capacity-used-ratio", 0.9, "max capacity used ratio for choosing store in balance")
	maxSendSnapCount       = flag.Uint64("max-sending-snap-count", 3, "max sending snapshot count for choosing store in balance")
	maxRecvSnapCount       = flag.Uint64("max-receiving-snap-count", 3, "max receiving snapshot count for choosing store in balance")
	maxDiffScoreFrac       = flag.Float64("max-diff-score-fraction", 0.1, "max diff score fraction for choosing store in balance")
	balanceInterval        = flag.Uint64("balance-interval", 30, "the interval time (s) to do balance")
	maxBalanceCount        = flag.Uint64("max-balance-count", 16, "the max region count to balance at the same time")
	maxBalanceRetryPerLoop = flag.Uint64("max-balance-retry-per-loop", 10, "the max retry count to balance in a balance schedule")
	maxBalanceCountPerLoop = flag.Uint64("max-balance-count-per-loop", 3, "the max region count to balance in a balance schedule")
	maxTransferWaitCount   = flag.Uint64("max-transfer-wait-count", 3, "the max heartbeat count to wait leader transfer to finish")
	maxStoreDownDuration   = flag.Uint64("max-store-down-duration", 60, "the max duration a store without heartbeats will be considered to be down")
)

func setCmdArgs(cfg *server.Config) {
	flag.Visit(func(flag *flag.Flag) {
		flagArgs[flag.Name] = true
	})

	setUintFlagConfig(&cfg.ClusterID, "cluster-id", *clusterID)
	setStringFlagConfig(&cfg.Name, "name", *name)
	setStringFlagConfig(&cfg.DataDir, "data-dir", *dataDir)
	setStringFlagConfig(&cfg.Host, "host", *host)
	setUintFlagConfig(&cfg.Port, "port", *port)
	setUintFlagConfig(&cfg.AdvertisePort, "advertise-port", *advertisePort)
	setUintFlagConfig(&cfg.HTTPPort, "http-port", *httpPort)
	setUintFlagConfig(&cfg.ClientPort, "client-port", *clientPort)
	setUintFlagConfig(&cfg.AdvertiseClientPort, "advertise-client-port", *advertiseClientPort)
	setUintFlagConfig(&cfg.PeerPort, "peer-port", *peerPort)
	setUintFlagConfig(&cfg.AdvertisePeerPort, "advertise-peer-port", *advertisePeerPort)
	setStringFlagConfig(&cfg.InitialCluster, "initial-cluser", *initialCluster)
	setStringFlagConfig(&cfg.InitialClusterState, "initial-cluster-state", *initialClusterState)

	setStringFlagConfig(&cfg.LogLevel, "L", *logLevel)

	setUintFlagConfig(&cfg.BalanceCfg.MaxLeaderCount, "max-leader-count", *maxLeaderCount)
	setFloatFlagConfig(&cfg.BalanceCfg.MinCapacityUsedRatio, "min-capacity-used-ratio", *minCapUsedRatio)
	setFloatFlagConfig(&cfg.BalanceCfg.MaxCapacityUsedRatio, "max-capacity-used-ratio", *maxCapUsedRatio)
	setUintFlagConfig(&cfg.BalanceCfg.MaxSendingSnapCount, "max-sending-snap-count", *maxSendSnapCount)
	setUintFlagConfig(&cfg.BalanceCfg.MaxReceivingSnapCount, "max-receiving-snap-count", *maxRecvSnapCount)
	setFloatFlagConfig(&cfg.BalanceCfg.MaxDiffScoreFraction, "max-diff-score-fraction", *maxDiffScoreFrac)
	setUintFlagConfig(&cfg.BalanceCfg.BalanceInterval, "balance-interval", *balanceInterval)
	setUintFlagConfig(&cfg.BalanceCfg.MaxBalanceCount, "max-balance-count", *maxBalanceCount)
	setUintFlagConfig(&cfg.BalanceCfg.MaxBalanceRetryPerLoop, "max-balance-retry-per-loop", *maxBalanceRetryPerLoop)
	setUintFlagConfig(&cfg.BalanceCfg.MaxBalanceCountPerLoop, "max-balance-count-per-loop", *maxBalanceCountPerLoop)
	setUintFlagConfig(&cfg.BalanceCfg.MaxTransferWaitCount, "max-transfer-wait-count", *maxTransferWaitCount)
	setUintFlagConfig(&cfg.BalanceCfg.MaxStoreDownDuration, "max-store-down-duration", *maxStoreDownDuration)
}

func main() {
	flag.Parse()

	cfg := server.NewConfig()

	if *config != "" {
		if err := cfg.LoadFromFile(*config); err != nil {
			log.Fatalf("load config failed - %s", err)
		}

		useConfigFile = true
		log.Infof("PD init config - %v", cfg)
	}

	setCmdArgs(cfg)

	log.SetLevelByString(cfg.LogLevel)
	log.SetHighlighting(false)

	svr, err := server.NewServer(cfg)
	if err != nil {
		log.Errorf("create pd server err %s\n", err)
		return
	}

	sc := make(chan os.Signal, 1)
	signal.Notify(sc,
		syscall.SIGHUP,
		syscall.SIGINT,
		syscall.SIGTERM,
		syscall.SIGQUIT)

	go func() {
		sig := <-sc
		log.Infof("Got signal [%d] to exit.", sig)
		svr.Close()
		os.Exit(0)
	}()

	go func() {
		err = api.ServeHTTP(fmt.Sprintf("0.0.0.0:%d", cfg.HTTPPort), svr)
		if err != nil {
			log.Fatalf("serve http failed - %v", errors.Trace(err))
		}
	}()

	err = svr.Run()
	if err != nil {
		log.Fatalf("server run failed - %v", errors.Trace(err))
	}
}

var (
	flagArgs      = map[string]bool{}
	useConfigFile = false
)

func setStringFlagConfig(dest *string, name string, value string) {
	if flagArgs[name] || !useConfigFile {
		*dest = value
	}
}

func setStringSliceFlagConfig(dest *[]string, name string, value string) {
	if flagArgs[name] || !useConfigFile {
		*dest = append([]string{}, strings.Split(value, ",")...)
	}
}

func setIntFlagConfig(dest *int64, name string, value int64) {
	if flagArgs[name] || !useConfigFile {
		*dest = value
	}
}

func setUintFlagConfig(dest *uint64, name string, value uint64) {
	if flagArgs[name] || !useConfigFile {
		*dest = value
	}
}

func setFloatFlagConfig(dest *float64, name string, value float64) {
	if flagArgs[name] || !useConfigFile {
		*dest = value
	}
}
