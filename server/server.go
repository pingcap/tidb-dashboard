package server

import (
	"net"
	"sync"
	"sync/atomic"
	"time"

	"github.com/coreos/etcd/clientv3"
	"github.com/juju/errors"
	"github.com/ngaut/log"
)

const (
	etcdTimeout = time.Second * 3
)

type Server struct {
	cfg *Config

	listener net.Listener

	client *clientv3.Client

	isLeader int64

	wg sync.WaitGroup

	connsLock sync.Mutex
	conns     map[*conn]struct{}
}

func NewServer(cfg *Config) (*Server, error) {
	log.Infof("create etcd client with endpoints %v", cfg.EtcdAddrs)

	client, err := clientv3.New(clientv3.Config{
		Endpoints:   cfg.EtcdAddrs,
		DialTimeout: etcdTimeout,
	})

	if err != nil {
		return nil, errors.Trace(err)
	}

	log.Infof("listen address %s", cfg.Addr)
	l, err := net.Listen("tcp", cfg.Addr)
	if err != nil {
		client.Close()
		return nil, errors.Trace(err)
	}

	s := &Server{
		cfg:      cfg,
		listener: l,
		client:   client,
		isLeader: 0,
	}

	return s, nil
}

func (s *Server) Close() {
	if s.listener != nil {
		s.listener.Close()
	}

	if s.client != nil {
		s.client.Close()
	}
}

// ListeningAddr returns listen address.
func (s *Server) ListeningAddr() string {
	return s.listener.Addr().String()
}

// IsLeader returns whether server is leader or not.
func (s *Server) IsLeader() bool {
	return atomic.LoadInt64(&s.isLeader) == 1
}

func (s *Server) Run() error {
	for {
		conn, err := s.listener.Accept()
		if err != nil {
			log.Errorf("accept err %s", err)
			break
		}

		if !s.IsLeader() {
			log.Infof("server %s is not leader, close connection directly", s.cfg.Addr)
			continue
		}

		c := newConn(s, conn)
		s.wg.Add(1)
		go c.run()
	}

	return nil
}
