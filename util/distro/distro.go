// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

// Package distro provides a type-safe distribution resource framework.
// Distribution resource determines how component names are displayed in errors, logs and so on.
// For example, a distribution resource can define "TiDB" to be displayed as "MyTiDB".
package distro

import (
	"encoding/json"
	"io/ioutil"
	"os"
	"path"
	"path/filepath"
	"sync"

	"github.com/pingcap/log"

	"go.uber.org/atomic"
	"go.uber.org/zap"
)

type DistributionResource struct {
	IsDistro bool   `json:"is_distro,omitempty"`
	TiDB     string `json:"tidb,omitempty"`
	TiKV     string `json:"tikv,omitempty"`
	PD       string `json:"pd,omitempty"`
	TiFlash  string `json:"tiflash,omitempty"`
}

var defaultDistroRes = DistributionResource{
	IsDistro: false,
	TiDB:     "TiDB",
	TiKV:     "TiKV",
	PD:       "PD",
	TiFlash:  "TiFlash",
}

var (
	globalDistroRes atomic.Value
	replaceGlobalMu sync.Mutex
)

const (
	DistroResFolderName      string = "distro-res"
	distroStringsResFileName string = "strings.json"
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

func StringsRes() (distroStringsRes DistributionResource) {
	exePath, err := os.Executable()
	if err != nil {
		log.Fatal("Failed to get work dir", zap.Error(err))
	}

	distroStringsResPath := path.Join(path.Dir(exePath), DistroResFolderName, distroStringsResFileName)
	info, err := os.Stat(distroStringsResPath)
	if err != nil || info.IsDir() {
		// ignore
		return
	}

	distroStringsFile, err := os.Open(filepath.Clean(distroStringsResPath))
	if err != nil {
		log.Fatal("Failed to open file", zap.String("path", distroStringsResPath), zap.Error(err))
	}
	defer func() {
		if err := distroStringsFile.Close(); err != nil {
			log.Error("Failed to close file", zap.String("path", distroStringsResPath), zap.Error(err))
		}
	}()

	data, err := ioutil.ReadAll(distroStringsFile)
	if err != nil {
		log.Fatal("Failed to read file", zap.String("path", distroStringsResPath), zap.Error(err))
	}

	err = json.Unmarshal(data, &distroStringsRes)
	if err != nil {
		log.Fatal("Failed to unmarshal distro strings res", zap.String("path", distroStringsResPath), zap.Error(err))
	}

	return
}
