package tidb

import (
	"io"
	"net"
	"sync"
	"time"

	"github.com/pingcap/log"
	"go.uber.org/atomic"
	"go.uber.org/zap"
)

type remote struct {
	addr     string
	inactive *atomic.Bool
}

func (r *remote) isActive() bool {
	return !r.inactive.Load()
}

func (r *remote) becomeInactive() {
	r.inactive.Store(true)
	log.Debug("remote become inactive", zap.String("remote", r.addr))
}

func (r *remote) dial(timeout time.Duration) error {
	conn, err := net.DialTimeout("tcp", r.addr, timeout)
	if err != nil {
		return err
	}
	conn.Close()
	r.inactive.Store(false)
	return nil
}

type proxy struct {
	listener      net.Listener
	checkInterval time.Duration
	dialTimeout   time.Duration
	doneCh        chan struct{}

	// The key is server ddl id
	remotes sync.Map
	current string
}

func newProxy(l net.Listener, endpoints map[string]string, checkInterval time.Duration, timeout time.Duration) *proxy {
	if checkInterval <= 0 {
		checkInterval = 5 * time.Second
	}
	if timeout == 0 {
		timeout = 3 * time.Second
	}
	p := &proxy{
		listener:      l,
		doneCh:        make(chan struct{}),
		remotes:       sync.Map{},
		dialTimeout:   timeout,
		checkInterval: checkInterval,
	}
	for key, e := range endpoints {
		p.remotes.Store(key, &remote{addr: e, inactive: atomic.NewBool(true)})
	}
	return p
}

func (p *proxy) port() int {
	return p.listener.Addr().(*net.TCPAddr).Port
}

func (p *proxy) updateRemotes(remotes map[string]string) {
	if remotes == nil {
		p.remotes = sync.Map{}
		return
	}
	// update or create new remote
	for key, newRemote := range remotes {
		if curRemote, ok := p.remotes.Load(key); !ok {
			log.Debug("proxy adds new remote", zap.String("remote", newRemote))
			p.remotes.Store(key, &remote{
				addr:     newRemote,
				inactive: atomic.NewBool(true),
			})
		} else {
			r := curRemote.(*remote)
			if r.addr != newRemote {
				log.Debug("proxy updates existing remote", zap.String("old", r.addr), zap.String("new", newRemote))
				r.addr = newRemote // could cause data race but doesnt matter
				r.becomeInactive()
			}
		}
	}
	// remove old remote
	p.remotes.Range(func(key, value interface{}) bool {
		k := key.(string)
		r := value.(*remote)
		if _, ok := remotes[k]; !ok {
			log.Debug("proxy discards remote", zap.String("remote", r.addr))
			p.remotes.Delete(key)
		}
		return true
	})
}

func (p *proxy) serve(in net.Conn) {
	var (
		err    error
		out    net.Conn
		picked *remote
	)
	for {
		picked = p.pick()
		if picked == nil {
			break
		}
		out, err = net.DialTimeout("tcp", picked.addr, p.dialTimeout)
		if err == nil {
			break
		}
		p.current = ""
		picked.becomeInactive()
		log.Warn("remote become inactive", zap.String("remote", picked.addr))
	}
	if out == nil {
		log.Warn("no alive remote, drop incoming conn")
		// Do we need issue a error here?
		in.Close()
		return
	}
	// bidirectional copy
	go func() {
		//nolint
		io.Copy(in, out)
		in.Close()
		out.Close()
	}()
	//nolint
	io.Copy(out, in)
	out.Close()
	in.Close()
}

// pick returns an active remote. If there
func (p *proxy) pick() *remote {
	var picked *remote
	if p.current == "" {
		p.remotes.Range(func(key, value interface{}) bool {
			id := key.(string)
			r := value.(*remote)
			if r.isActive() {
				p.current = id
				picked = r
				return false
			}
			return true
		})
	}
	if picked != nil {
		return picked
	}
	if p.current != "" {
		r, ok := p.remotes.Load(p.current)
		if ok {
			picked = r.(*remote)
		}
	}
	return picked
}

func (p *proxy) doCheck() {
	for {
		select {
		case <-time.After(p.checkInterval):
			p.remotes.Range(func(key, value interface{}) bool {
				rmt := value.(*remote)
				if rmt.isActive() {
					return true
				}
				go func(r *remote) {
					log.Debug("run remote check", zap.String("remote", r.addr))
					if err := r.dial(p.dialTimeout); err != nil {
						log.Warn("fail to recv activity from remote, stay inactive and wait to next checking round", zap.String("remote", r.addr), zap.Duration("interval", p.checkInterval), zap.Error(err))
					} else {
						log.Debug("remote become active", zap.String("remote", r.addr))
					}
				}(rmt)
				return true
			})
		case <-p.doneCh:
			return
		}
	}
}

func (p *proxy) run() {
	endpoints := []string{}
	p.remotes.Range(func(key, value interface{}) bool {
		r := value.(*remote)
		endpoints = append(endpoints, r.addr)
		return true
	})
	log.Info("start serve requests to remotes", zap.String("endpoint", p.listener.Addr().String()), zap.Strings("remotes", endpoints))
	go p.doCheck()
	// wait a check round before serve connections
	time.Sleep(p.checkInterval + time.Second)
	for {
		select {
		case <-p.doneCh:
			p.listener.Close()
			return
		default:
			incoming, err := p.listener.Accept()
			if err != nil {
				log.Warn("got err from listener", zap.Error(err), zap.String("from", p.listener.Addr().String()))
			} else {
				go p.serve(incoming)
			}
		}
	}
}

func (p *proxy) stop() {
	close(p.doneCh)
}
