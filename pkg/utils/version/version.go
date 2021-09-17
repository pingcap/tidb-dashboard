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

package version

import (
	"fmt"
	"strings"

	"github.com/pingcap/log"
	"go.uber.org/zap"

	"github.com/pingcap/tidb-dashboard/pkg/utils/distro"
)

type Info struct {
	InternalVersion string `json:"internal_version"`
	Standalone      string `json:"standalone"`
	PDVersion       string `json:"pd_version"`
	BuildTime       string `json:"build_time"`
	BuildGitHash    string `json:"build_git_hash"`
}

// Version information. It will be overwritten by LDFLAGS.
var (
	InternalVersion = "Unknown"
	Standalone      = "Unknown" // Unknown, Yes or No
	PDVersion       = "Unknown"
	BuildTime       = "Unknown"
	BuildGitHash    = "Unknown"
)

func Print() {
	log.Info(fmt.Sprintf("%s Dashboard started", distro.Data("tidb")),
		zap.String("internal-version", InternalVersion),
		zap.String("standalone", Standalone),
		zap.String(fmt.Sprintf("%s-version", strings.ToLower(distro.Data("pd"))), PDVersion),
		zap.String("build-time", BuildTime),
		zap.String("build-git-hash", BuildGitHash))
}

func GetInfo() *Info {
	return &Info{
		InternalVersion: InternalVersion,
		Standalone:      Standalone,
		PDVersion:       PDVersion,
		BuildTime:       BuildTime,
		BuildGitHash:    BuildGitHash,
	}
}

func PrintStandaloneModeInfo() {
	fmt.Println("Internal Version: ", InternalVersion)
	fmt.Println("Git Commit Hash:  ", BuildGitHash)
	fmt.Println("UTC Build Time:   ", BuildTime)
}
