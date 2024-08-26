// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

// Package proxy provides a TCP reverse proxy. Unlike normal reverse proxy, the upstream is intentionally fixed.
// A new upstream will be selected if the current upstream is down.
package proxy

import (
	"context"
	"io"
	"net"
	"sync"
	"time"

	"github.com/pingcap/log"
	"go.uber.org/atomic"
	"go.uber.org/zap"

	"github.com/pingcap/tidb-dashboard/util/nocopy"
)

type Proxy struct {
	nocopy.NoCopy

	config Config

	listener  net.Listener
	ctx       context.Context
	ctxCancel context.CancelFunc

	upstreams           sync.Map // The key is the address in string type. The value is in type *upstream.
	noActiveUpstream    *atomic.Bool
	currentUpstreamAddr *atomic.String
}

type Config struct {
	KindTag               string
	UpstreamProbeInterval time.Duration
	DialTimeout           time.Duration
}

const (
	DefaultUpstreamProbeInterval = 2 * time.Second
	DefaultDialTimeout           = 3 * time.Second
)

func New(config Config) (*Proxy, error) {
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return nil, err
	}
	ctx, cancel := context.WithCancel(context.Background())

	if config.UpstreamProbeInterval <= 0 {
		config.UpstreamProbeInterval = DefaultUpstreamProbeInterval
	}
	if config.DialTimeout <= 0 {
		config.DialTimeout = DefaultDialTimeout
	}
	p := &Proxy{
		config:              config,
		listener:            l,
		ctx:                 ctx,
		ctxCancel:           cancel,
		upstreams:           sync.Map{},
		noActiveUpstream:    atomic.NewBool(true),
		currentUpstreamAddr: atomic.NewString(""),
	}

	go p.runListenerLoop()
	go p.runProbeLoop()

	return p, nil
}

// HasActiveUpstream returns whether there is an active upstream.
func (p *Proxy) HasActiveUpstream() bool {
	return !p.noActiveUpstream.Load()
}

// Close stops any running loops and stops the listener.
// This function is concurrent-safe.
func (p *Proxy) Close() {
	p.ctxCancel()
	_ = p.listener.Close()
}

// Port returns the actual listening port.
func (p *Proxy) Port() int {
	return p.listener.Addr().(*net.TCPAddr).Port
}

// SetUpstreams sets the upstream address list.
// This function is concurrent-safe.
func (p *Proxy) SetUpstreams(addresses []string) {
	if len(addresses) == 0 {
		log.Debug("All endpoints are removed from the upstream list",
			zap.String("kindTag", p.config.KindTag))
		p.upstreams.Range(func(key, _ interface{}) bool {
			p.upstreams.Delete(key)
			return true
		})
		p.currentUpstreamAddr.Store("")
		p.noActiveUpstream.Store(true)
		return
	}

	// Add new upstreams
	for _, addr := range addresses {
		if _, ok := p.upstreams.Load(addr); !ok {
			log.Debug("An endpoint is added to the upstream list",
				zap.String("kindTag", p.config.KindTag),
				zap.String("addr", addr))
			p.upstreams.Store(addr, newUpstream(p.config.KindTag, addr))
		}
	}

	// Remove old upstreams
	addrSet := make(map[string]struct{})
	for _, addr := range addresses {
		addrSet[addr] = struct{}{}
	}
	p.upstreams.Range(func(key, _ interface{}) bool {
		addr := key.(string)
		if _, ok := addrSet[addr]; !ok {
			log.Debug("An endpoint is removed from the upstream list",
				zap.String("kindTag", p.config.KindTag),
				zap.String("addr", addr))
			p.upstreams.Delete(key)
		}
		return true
	})
}

func (p *Proxy) serveConnection(in net.Conn) {
	out := p.pickActiveUpstreamAndConnect()
	if out == nil {
		_ = in.Close()
		return
	}
	// bidirectional copy
	go func() {
		_, _ = io.Copy(in, out)
		_ = in.Close()
		_ = out.Close()
	}()
	_, _ = io.Copy(out, in)
	_ = out.Close()
	_ = in.Close()
}

func (p *Proxy) pickActiveUpstreamAndConnect() net.Conn {
	for {
		picked := p.pickOneLastActiveUpstream()
		if picked == nil {
			// There is no active upstream for now.
			// We stop and wait the prober to discover an active upstreams later.
			{
				currentAddr := p.currentUpstreamAddr.Load()
				if currentAddr != "" {
					log.Warn("No upstream is active",
						zap.String("kindTag", p.config.KindTag),
						zap.String("lastUpstreamAddr", currentAddr))
				}
			}

			p.currentUpstreamAddr.Store("")
			p.noActiveUpstream.Store(true)
			return nil
		}

		conn, err := picked.Connect(p.config.DialTimeout)
		if err == nil {
			// Connect is successful, memorize this upstream for future connection.
			{
				currentAddr := p.currentUpstreamAddr.Load()
				if currentAddr != picked.addr {
					log.Info("Using new upstream",
						zap.String("kindTag", p.config.KindTag),
						zap.String("lastUpstreamAddr", currentAddr),
						zap.String("newUpstreamAddr", picked.addr))
				}
			}

			p.currentUpstreamAddr.Store(picked.addr)
			p.noActiveUpstream.Store(false)
			return conn
		}

		// We know that this upstream doesn't look good. Update its status.
		p.currentUpstreamAddr.Store("")
	}
}

// pickOneLastActiveUpstream returns an upstream which is last known as active.
// If there is no active upstream, nil will be returned.
func (p *Proxy) pickOneLastActiveUpstream() *upstream {
	currentUpstream := p.currentUpstreamAddr.Load()
	if currentUpstream != "" {
		// It is possible that the upstream list has been changed.
		r, ok := p.upstreams.Load(currentUpstream)
		if ok {
			picked := r.(*upstream)
			if picked.IsActive() {
				return picked
			}
		}
	}

	var picked *upstream
	p.upstreams.Range(func(_, value interface{}) bool {
		r := value.(*upstream)
		if r.IsActive() {
			picked = r
			return false
		}
		return true
	})
	return picked
}

// probeActiveUpstreams iterates all inactive upstreams and try to update its status to active.
func (p *Proxy) probeActiveUpstreams() {
	activeUpstreams := 0

	p.upstreams.Range(func(_, value interface{}) bool {
		r := value.(*upstream)
		if r.IsActive() {
			activeUpstreams++
		} else {
			r.TryProbeAsync(p.config.DialTimeout)
		}
		return true
	})

	if activeUpstreams > 0 {
		// As long as there is any upstream recognized as active, there is active upstream.
		p.noActiveUpstream.Store(false)
	}
}

func (p *Proxy) runProbeLoop() {
	for {
		select {
		case <-p.ctx.Done():
			return
		case <-time.After(p.config.UpstreamProbeInterval):
			p.probeActiveUpstreams()
		}
	}
}

func (p *Proxy) runListenerLoop() {
	for {
		select {
		case <-p.ctx.Done():
			return
		default:
			conn, err := p.listener.Accept()
			if err != nil {
				// Ignore listener close error
				// TODO: Use `if !errors.Is(err, net.ErrClosed)` for higher Golang compilers.
				log.Warn("Accept incoming connection failed",
					zap.String("remoteAddr", p.listener.Addr().String()),
					zap.Error(err))
			} else {
				go p.serveConnection(conn)
			}
		}
	}
}
