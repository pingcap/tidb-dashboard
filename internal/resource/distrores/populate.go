// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package distrores

import (
	"os"
	"path"

	"github.com/pingcap/log"
	"go.uber.org/zap"

	"github.com/pingcap/tidb-dashboard/util/distro"
)

const (
	distroResFolderName      string = "distro-res"
	distroStringsResFileName string = "strings.json"
)

func init() {
	exePath, err := os.Executable()
	if err != nil {
		log.Fatal("Failed to get executable path", zap.Error(err))
	}

	distroStringsResPath := path.Join(path.Dir(exePath), distroResFolderName, distroStringsResFileName)
	distroStringsRes, err := distro.ReadResourceStringsFromFile(distroStringsResPath)
	if err != nil {
		log.Fatal("Failed to read distro strings res", zap.String("path", distroStringsResPath), zap.Error(err))
	}

	distro.ReplaceGlobal(distroStringsRes)
}
