// Copyright 2020 PingCAP, Inc.
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

package utils

import (
	"fmt"

	"github.com/pingcap/log"
	"go.uber.org/zap"
)

type VersionInfo struct {
	InternalVersion string `json:"internal_version"`
	Standalone      bool   `json:"standalone"`
	PDVersion       string `json:"pd_version"`
	BuildTime       string `json:"build_time"`
	BuildGitHash    string `json:"build_git_hash"`
}

func (v *VersionInfo) Print() {
	log.Info("TiDB Dashboard started",
		zap.String("internal-version", v.InternalVersion),
		zap.Bool("standalone", v.Standalone),
		zap.String("pd-version", v.PDVersion),
		zap.String("build-time", v.BuildTime),
		zap.String("build-git-hash", v.BuildGitHash))
}

// Version information.
var (
	StandaloneInternalVersion = "Unknown"
	StandaloneBuildTS         = "Unknown"
	StandaloneGitHash         = "Unknown"
)

func PrintStandaloneModeInfo() {
	fmt.Println("Internal Version: ", StandaloneInternalVersion)
	fmt.Println("Git Commit Hash:  ", StandaloneGitHash)
	fmt.Println("UTC Build Time:   ", StandaloneBuildTS)
}

func GetStandaloneModeVersionInfo() *VersionInfo {
	return &VersionInfo{
		Standalone:      true,
		InternalVersion: StandaloneInternalVersion,
		BuildTime:       StandaloneBuildTS,
		BuildGitHash:    StandaloneGitHash,
	}
}
