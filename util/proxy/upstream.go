// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package proxy

import (
	"net"
	"time"

	"github.com/pingcap/log"
	"go.uber.org/atomic"
	"go.uber.org/zap"
)

type upstream struct {
	kindTag string
	addr    string
	active  *atomic.Bool
}

func newUpstream(kindTag, addr string) *upstream {
	return &upstream{
		kindTag: kindTag,
		addr:    addr,
		active:  atomic.NewBool(false),
	}
}

// IsActive is concurrent-safe.
func (r *upstream) IsActive() bool {
	return r.active.Load()
}

// setInactive is concurrent-safe.
func (r *upstream) setInactive() {
	lastIsActive := r.active.Swap(false)
	if lastIsActive {
		log.Info("An upstream becomes inactive",
			zap.String("kindTag", r.kindTag),
			zap.String("addr", r.addr))
	}
}

// setActive is concurrent-safe.
func (r *upstream) setActive() {
	lastIsActive := r.active.Swap(true)
	if !lastIsActive {
		log.Debug("An upstream becomes active",
			zap.String("kindTag", r.kindTag),
			zap.String("addr", r.addr))
	}
}

// Connect connects to the upstream no matter it is active or not, and update the active status according to connect status.
// When connect failed, the error will be returned and the status will be updated to inactive.
// When connect succeeded, the connection will be returned and the status will be updated to active.
// This function is concurrent-safe.
func (r *upstream) Connect(dialTimeout time.Duration) (net.Conn, error) {
	log.Debug("Trying to connect to upstream",
		zap.String("kindTag", r.kindTag),
		zap.Bool("lastIsActive", r.active.Load()),
		zap.String("addr", r.addr))

	conn, err := net.DialTimeout("tcp", r.addr, dialTimeout)
	if err != nil {
		r.setInactive()
		return nil, err
	}
	r.setActive()
	return conn, nil
}

// TryProbeAsync probes the upstream if it is not last known as active.
func (r *upstream) TryProbeAsync(dialTimeout time.Duration) {
	if r.IsActive() {
		return
	}
	go func() {
		conn, err := r.Connect(dialTimeout)
		if err != nil {
			// TODO: Reduce number of logs
			log.Debug("The upstream is still inactive, will be probed again later.",
				zap.String("kindTag", r.kindTag),
				zap.String("addr", r.addr),
				zap.Error(err))
			return
		}

		// Connect is succeeded, close the connection.
		_ = conn.Close()
	}()
}
