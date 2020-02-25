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
	ReleaseVersion = "None"
	BuildTS        = "None"
	GitHash        = "None"
	GitBranch      = "None"
)

type VersionInfo struct {
	ReleaseVersion string `json:"release_version"`
	BuildTime      string `json:"build_time"`
	BuildGitHash   string `json:"build_git_hash"`
	BuildGitBranch string `json:"build_git_branch"`
}

func LogInfo() {
	log.Info("Welcome to TiDB Dashboard")
	log.Info("", zap.String("release-version", ReleaseVersion))
	log.Info("", zap.String("git-hash", GitHash))
	log.Info("", zap.String("git-branch", GitBranch))
	log.Info("", zap.String("utc-build-time", BuildTS))
}

func PrintInfo() {
	fmt.Println("Release Version:", ReleaseVersion)
	fmt.Println("Git Commit Hash:", GitHash)
	fmt.Println("Git Branch:", GitBranch)
	fmt.Println("UTC Build Time: ", BuildTS)
}

func GetVersionInfo() VersionInfo {
	return VersionInfo{
		ReleaseVersion: ReleaseVersion,
		BuildTime:      BuildTS,
		BuildGitHash:   GitHash,
		BuildGitBranch: GitBranch,
	}
}
