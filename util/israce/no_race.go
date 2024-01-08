// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

//go:build !race
// +build !race

// Package israce reports if the Go race detector is enabled.
package israce

// Enabled reports if the race detector is enabled.
const Enabled = false
