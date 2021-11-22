// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

// Package distro provides a type-safe distribution resource framework.
// Distribution resource determines how component names are displayed in errors, logs and so on.
// For example, a distribution resource can define "TiDB" to be displayed as "MyTiDB".
package distro

import (
	"encoding/json"
	"sync"

	"go.uber.org/atomic"
)

type DistributionResource struct {
	TiDB    string `json:"tidb,omitempty"`
	TiKV    string `json:"tikv,omitempty"`
	PD      string `json:"pd,omitempty"`
	TiFlash string `json:"tiflash,omitempty"`
}

var defaultDistroRes = DistributionResource{
	TiDB:    "TiDB",
	TiKV:    "TiKV",
	PD:      "PD",
	TiFlash: "TiFlash",
}

var (
	globalDistroRes atomic.Value
	replaceGlobalMu sync.Mutex
)

// ReplaceGlobal replaces the global distribution resource with the specified one. Missing fields in the
// resource will be filled using default values.
func ReplaceGlobal(r DistributionResource) func() {
	// TODO: To be replaced by atomic.Value.Swap() in Go 1.16
	replaceGlobalMu.Lock()
	defer replaceGlobalMu.Unlock()

	// Save current resources for restoring back.
	currentGlobals := *R()

	// Fill missing resources with the default one by using JSON Unmarshal.
	newResource := defaultDistroRes
	rJSON, _ := json.Marshal(r)             // This will never fail
	_ = json.Unmarshal(rJSON, &newResource) // This will never fail
	globalDistroRes.Store(&newResource)

	return func() {
		ReplaceGlobal(currentGlobals)
	}
}

// R gets the current global distribution resource. The returned value must NOT be modified.
func R() *DistributionResource {
	r := globalDistroRes.Load()
	if r == nil {
		return &defaultDistroRes
	}
	return r.(*DistributionResource)
}
