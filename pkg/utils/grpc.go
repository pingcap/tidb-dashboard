// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package utils

import (
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/backoff"
	"google.golang.org/grpc/keepalive"
)

var (
	DefaultGRPCConnectParams = grpc.ConnectParams{
		Backoff: backoff.Config{
			BaseDelay:  100 * time.Millisecond, // Default was 1 second
			Multiplier: 1.6,                    // Default
			Jitter:     0.2,                    // Default
			MaxDelay:   3 * time.Second,        // Default was 120 seconds
		},
		MinConnectTimeout: 5 * time.Second, // Default was 20 seconds
	}
	DefaultGRPCKeepaliveParams = keepalive.ClientParameters{
		Time:                10 * time.Second,
		Timeout:             3 * time.Second,
		PermitWithoutStream: false,
	}
)

var DefaultGRPCDialOptions = []grpc.DialOption{
	grpc.WithConnectParams(DefaultGRPCConnectParams),
}
