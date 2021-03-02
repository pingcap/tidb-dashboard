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
		RewriteAssets(assets, cfg, func(fs http.FileSystem, f http.File, path, newContent string, bs []byte) {
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
