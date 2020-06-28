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

// Version information.
var (
	InternalVersion = "Unknown"
	PDVersion       = ""
	BuildTS         = "Unknown"
	GitHash         = "Unknown"
	GitBranch       = "Unknown"
)

type VersionInfo struct {
	InternalVersion string `json:"internal_version"`
	PDVersion       string `json:"pd_version"`
	BuildTime       string `json:"build_time"`
	BuildGitHash    string `json:"build_git_hash"`
	BuildGitBranch  string `json:"build_git_branch"`
}

func LogStandaloneModeInfo() {
	log.Info("Welcome to TiDB Dashboard",
		zap.String("internal-version", InternalVersion),
		zap.String("git-hash", GitHash),
		zap.String("git-branch", GitBranch),
		zap.String("utc-build-time", BuildTS))
}

func PrintStandaloneModeInfo() {
	fmt.Println("Internal Version:", InternalVersion)
	fmt.Println("Git Commit Hash:", GitHash)
	fmt.Println("Git Branch:", GitBranch)
	fmt.Println("UTC Build Time: ", BuildTS)
}

func GetStandaloneModeVersionInfo() VersionInfo {
	return VersionInfo{
		InternalVersion: InternalVersion,
		BuildTime:       BuildTS,
		BuildGitHash:    GitHash,
		BuildGitBranch:  GitBranch,
	}
}
