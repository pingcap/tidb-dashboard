package main

import (
	"flag"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"github.com/ngaut/log"
	"github.com/pingcap/pd/server"
)

var (
	addr        = flag.String("addr", "127.0.0.1:1234", "server listening address")
	etcdAddrs   = flag.String("etcd", "127.0.0.1:2379", "Etcd endpoints, separated by comma")
	rootPath    = flag.String("root", "/pd", "pd root path in etcd")
	leaderLease = flag.Int64("lease", 3, "Leader lease time (second)")
	logLevel    = flag.String("L", "debug", "log level: info, debug, warn, error, fatal")
)

func main() {
	flag.Parse()

	log.SetLevelByString(*logLevel)

	cfg := &server.Config{
		Addr:        *addr,
		EtcdAddrs:   strings.Split(*etcdAddrs, ","),
		RootPath:    *rootPath,
		LeaderLease: *leaderLease,
	}

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

	svr.Run()
}
