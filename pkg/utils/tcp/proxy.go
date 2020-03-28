package tcp

import (
	"io"
	"net"
	"sync"
	"time"

	"github.com/pingcap/log"
	"go.uber.org/zap"
)

type remote struct {
	addr     string
	mu       sync.Mutex
	inactive bool
}

func (r *remote) isActive() bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	return !r.inactive
}

func (r *remote) becomeInactive() {
	r.mu.Lock()
	r.inactive = true
	r.mu.Unlock()
}

func (r *remote) ping(timeout time.Duration) error {
	conn, err := net.DialTimeout("tcp", r.addr, timeout)
	if err != nil {
		return err
	}
	conn.Close()
	r.mu.Lock()
	r.inactive = false
	r.mu.Unlock()
	return nil
}

type Proxy struct {
	l             net.Listener
	checkInterval time.Duration
	dialTimeout   time.Duration
	endpoints     []string
	donec         chan struct{}

	mu        sync.Mutex
	remotes   []*remote
	pickCount int
}

func NewProxy(l net.Listener, endpoints []string, checkInterval time.Duration, timeout time.Duration) *Proxy {
	if checkInterval == 0 {
		checkInterval = 5 * time.Second
	}
	if timeout == 0 {
		timeout = 10 * time.Second
	}
	var remotes []*remote
	for _, e := range endpoints {
		remotes = append(remotes, &remote{
			addr:     e,
			inactive: true,
		})
	}
	return &Proxy{
		l:             l,
		donec:         make(chan struct{}),
		remotes:       remotes,
		endpoints:     endpoints,
		checkInterval: checkInterval,
	}
}

func (p *Proxy) serve(in net.Conn) {
	var (
		err error
		out net.Conn
	)
	for {
		p.mu.Lock()
		remote := p.pick()
		p.mu.Unlock()
		if remote == nil {
			break
		}
		out, err = net.DialTimeout("tcp", remote.addr, p.dialTimeout)
		if err == nil {
			break
		}
		remote.becomeInactive()
		log.Warn("remote become inactive", zap.String("remote", remote.addr))
	}
	if out == nil {
		in.Close()
		return
	}
	io.Copy(in, out)
	in.Close()
	out.Close()
}

func (p *Proxy) pick() *remote {
	var activeRemotes []*remote
	for _, r := range p.remotes {
		if r.isActive() {
			activeRemotes = append(activeRemotes, r)
		}
	}
	if len(activeRemotes) == 0 {
		return nil
	}
	r := p.pickCount % len(activeRemotes)
	p.pickCount += 1
	return activeRemotes[r]
}

func (p *Proxy) doCheck() {
	for {
		select {
		case <-time.After(p.checkInterval):
			p.mu.Lock()
			for _, rmt := range p.remotes {
				if rmt.isActive() {
					continue
				}
				go func(r *remote) {
					log.Debug("run remote check", zap.String("remote", r.addr))
					if err := r.ping(p.dialTimeout); err != nil {
						log.Warn("fail to recv activity from remote, stay inactive and wait to next checking round", zap.String("remote", r.addr), zap.Duration("interval", p.checkInterval), zap.Error(err))
					} else {
						log.Debug("remote become active", zap.String("remote", r.addr))
					}
				}(rmt)
			}
			p.mu.Unlock()
		case <-p.donec:
			return
		}
	}
}

func (p *Proxy) Run() error {
	log.Info("start serve requests to remotes", zap.Strings("remotes", p.endpoints))
	go p.doCheck()
	// wait a ping before serve connections
	time.Sleep(p.checkInterval)
	for {
		incoming, err := p.l.Accept()
		if err != nil {
			return err
		}
		go p.serve(incoming)
	}
}

func (p *Proxy) Stop() {
	p.l.Close()
	close(p.donec)
}
