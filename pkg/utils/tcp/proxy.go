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
	log.Debug("remote become inactive", zap.String("remote", r.addr))
}

func (r *remote) dial(timeout time.Duration) error {
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
	donec         chan struct{}
	errc          chan error

	mu        sync.Mutex
	remotes   map[string]*remote
	pickCount int // for RoundRobin count
}

func NewProxy(l net.Listener, endpoints map[string]string, checkInterval time.Duration, timeout time.Duration) *Proxy {
	if checkInterval == 0 {
		checkInterval = 5 * time.Second
	}
	if timeout == 0 {
		timeout = 10 * time.Second
	}
	remotes := make(map[string]*remote)
	for key, e := range endpoints {
		remotes[key] = &remote{
			addr:     e,
			inactive: true,
		}
	}
	return &Proxy{
		l:             l,
		errc:          make(chan error),
		donec:         make(chan struct{}),
		remotes:       remotes,
		checkInterval: checkInterval,
	}
}

func (p *Proxy) updateRemotes(remotes map[string]string) {
	p.mu.Lock()
	defer p.mu.Unlock()
	// remove all remotes
	if remotes == nil {
		p.remotes = make(map[string]*remote)
		return
	}
	// update or create new remote
	for key, nr := range remotes {
		if cr, ok := p.remotes[key]; !ok {
			log.Debug("proxy adds new remote", zap.String("remote", nr))
			p.remotes[key] = &remote{
				addr:     nr,
				inactive: true,
			}
		} else if cr.addr != nr {
			log.Debug("proxy updates existing remote", zap.String("old", cr.addr), zap.String("new", nr))
			cr.addr = nr // could cause data race but doesnt matter
			cr.becomeInactive()
		}
	}
	// remove old remote
	for key, r := range p.remotes {
		if _, ok := remotes[key]; !ok {
			log.Debug("proxy discards remote", zap.String("remote", r.addr))
			delete(p.remotes, key)
		}
	}
}

func (p *Proxy) serve(in net.Conn) {
	var (
		err    error
		out    net.Conn
		picked *remote
	)
	for {
		p.mu.Lock()
		picked = p.pick()
		p.mu.Unlock()
		if picked == nil {
			break
		}
		out, err = net.DialTimeout("tcp", picked.addr, p.dialTimeout)
		if err == nil {
			break
		}
		picked.becomeInactive()
		log.Warn("remote become inactive", zap.String("remote", picked.addr))
	}
	if out == nil {
		// Do we need issue a error here?
		in.Close()
		return
	}
	go func() {
		// send response
		if _, err = io.Copy(in, out); err != nil {
			log.Warn("proxy send response failed", zap.Error(err))
		}
		in.Close()
		out.Close()
	}()
	// send request
	if _, err = io.Copy(out, in); err != nil {
		log.Warn("proxy send request failed", zap.Error(err))
	}
}

func (p *Proxy) pick() *remote {
	activeRemotes := []*remote{}
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
					if err := r.dial(p.dialTimeout); err != nil {
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

func (p *Proxy) Run() {
	endpoints := []string{}
	for _, r := range p.remotes {
		endpoints = append(endpoints, r.addr)
	}
	log.Info("start serve requests to remotes", zap.String("endpoint", p.l.Addr().String()), zap.Strings("remotes", endpoints))
	go p.doCheck()
	// wait a check round before serve connections
	time.Sleep(p.checkInterval + time.Second)
	for {
		select {
		case <-p.donec:
			p.l.Close()
			return
		default:
			incoming, err := p.l.Accept()
			if err != nil {
				log.Warn("got err from listener", zap.Error(err), zap.String("from", p.l.Addr().String()))
			} else {
				go p.serve(incoming)
			}
		}
	}
}

func (p *Proxy) Stop() {
	close(p.donec)
}
