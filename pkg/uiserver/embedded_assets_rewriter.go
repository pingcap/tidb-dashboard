// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

// +build ui_server

package uiserver

import (
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/pingcap/tidb-dashboard/pkg/config"
)

var once sync.Once

func Assets(cfg *config.Config) http.FileSystem {
	once.Do(func() {
		exePath, err := os.Executable()
		if err != nil {
			log.Fatal("Failed to get executable path", zap.Error(err))
		}

		distroResFolderPath := path.Join(path.Dir(exePath), distroResFolderName)
		RewriteAssets(assets, cfg, distroResFolderPath, func(fs http.FileSystem, f http.File, path, newContent string, bs []byte) {
			m := fs.(vfsgen۰FS)
			fi := f.(os.FileInfo)
			m[path] = &vfsgen۰CompressedFileInfo{
				name:              fi.Name(),
				modTime:           time.Now(),
				uncompressedSize:  int64(len(newContent)),
				compressedContent: bs,
			}
		})
	})
	return assets
}
