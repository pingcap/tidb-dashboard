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

// Version information.
var (
	StandaloneInternalVersion = "Unknown"
	StandaloneBuildTS         = "Unknown"
	StandaloneGitHash         = "Unknown"
)

func LogStandaloneModeInfo() {
	log.Info("Welcome to TiDB Dashboard",
		zap.String("internal-version", StandaloneInternalVersion),
		zap.String("git-hash", StandaloneGitHash),
		zap.String("utc-build-time", StandaloneBuildTS))
}

func PrintStandaloneModeInfo() {
	fmt.Println("Internal Version:", StandaloneInternalVersion)
	fmt.Println("Git Commit Hash:", StandaloneGitHash)
	fmt.Println("UTC Build Time: ", StandaloneBuildTS)
}

func GetStandaloneModeVersionInfo() *VersionInfo {
	return &VersionInfo{
		Standalone:      true,
		InternalVersion: StandaloneInternalVersion,
		BuildTime:       StandaloneBuildTS,
		BuildGitHash:    StandaloneGitHash,
	}
}
