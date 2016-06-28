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

package server

import "time"

const (
	defaultRootPath        = "pd"
	defaultLeaderLease     = 3
	defaultTsoSaveInterval = 2000
	defaultNextRetryDelay  = time.Second
	defaultMaxPeerCount    = uint32(3)
	defaultMetrixPrefix    = "pd"
)

// Config is the pd server configuration.
type Config struct {
	// Server listening address.
	Addr string

	// HTTP server listening address.
	HTTPAddr string

	// Server advertise listening address for outer client communication.
	// If not set, using default Addr instead.
	AdvertiseAddr string

	// Etcd endpoints
	EtcdAddrs []string

	// RootPath in Etcd as the prefix for all keys. If not set, use default "pd".
	RootPath string

	// LeaderLease time, if leader doesn't update its TTL
	// in etcd after lease time, etcd will expire the leader key
	// and other servers can campaign the leader again.
	// Etcd onlys support seoncds TTL, so here is second too.
	LeaderLease int64

	// TsoSaveInterval is the interval time (ms) to save timestamp.
	// When the leader begins to run, it first loads the saved timestamp from etcd, e.g, T1,
	// and the leader must guarantee that the next timestamp must be > T1 + 2 * TsoSaveInterval.
	TsoSaveInterval int64

	// ClusterID is the cluster ID communicating with other services.
	ClusterID uint64

	// MaxPeerCount for a region. default is 3.
	MaxPeerCount uint32

	// Remote metric address for StatsD.
	MetricAddr string

	// Metric prefix.
	MetricPrefix string

	// For capacity balance.
	MinCapacityUsedRatio float64
	MaxCapacityUsedRatio float64

	// Only test can change it.
	nextRetryDelay time.Duration
}

func (c *Config) adjust() {
	if len(c.RootPath) == 0 {
		c.RootPath = defaultRootPath
	}
	// TODO: Maybe we should do more check for root path, only allow letters?

	if c.LeaderLease <= 0 {
		c.LeaderLease = defaultLeaderLease
	}

	if c.TsoSaveInterval <= 0 {
		c.TsoSaveInterval = defaultTsoSaveInterval
	}

	if c.nextRetryDelay == 0 {
		c.nextRetryDelay = defaultNextRetryDelay
	}

	if c.MaxPeerCount == 0 {
		c.MaxPeerCount = defaultMaxPeerCount
	}

	if len(c.MetricPrefix) == 0 {
		c.MetricPrefix = defaultMetrixPrefix
	}

	if c.MinCapacityUsedRatio == 0 {
		c.MinCapacityUsedRatio = minCapacityUsedRatio
	}

	if c.MaxCapacityUsedRatio == 0 {
		c.MaxCapacityUsedRatio = maxCapacityUsedRatio
	}
}
