// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

// Package distro provides a type-safe distribution resource framework.
// Distribution resource determines how component names are displayed in errors, logs and so on.
// For example, a distribution resource can define "TiDB" to be displayed as "MyTiDB".
package distro

import (
	"encoding/json"
	"errors"
	"io"
	"os"
	"path/filepath"
	"sync"

	"go.uber.org/atomic"
)

type DistributionResource struct {
	IsDistro   bool   `json:"is_distro,omitempty"`
	TiDB       string `json:"tidb,omitempty"`
	TiKV       string `json:"tikv,omitempty"`
	PD         string `json:"pd,omitempty"`
	TiFlash    string `json:"tiflash,omitempty"`
	TiCDC      string `json:"ticdc,omitempty"`
	TiProxy    string `json:"tiproxy,omitempty"`
	TSO        string `json:"tso,omitempty"`
	Scheduling string `json:"scheduling,omitempty"`
}

var defaultDistroRes = DistributionResource{
	IsDistro:   false,
	TiDB:       "TiDB",
	TiKV:       "TiKV",
	PD:         "PD",
	TiFlash:    "TiFlash",
	TiCDC:      "TiCDC",
	TiProxy:    "TiProxy",
	TSO:        "TSO",
	Scheduling: "Scheduling",
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

func ReadResourceStringsFromFile(filePath string) (DistributionResource, error) {
	distroStringsRes := DistributionResource{}

	info, err := os.Stat(filePath)
	if errors.Is(err, os.ErrNotExist) || info.IsDir() {
		// ignore if file not exist or it is a folder
		return distroStringsRes, nil
	}
	if err != nil {
		// may be permission-like errors
		return distroStringsRes, err
	}

	distroStringsFile, err := os.Open(filepath.Clean(filePath))
	if err != nil {
		return distroStringsRes, err
	}
	defer func() {
		_ = distroStringsFile.Close()
	}()

	data, err := io.ReadAll(distroStringsFile)
	if err != nil {
		return distroStringsRes, err
	}

	err = json.Unmarshal(data, &distroStringsRes)
	return distroStringsRes, err
}
