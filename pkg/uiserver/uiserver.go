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

package uiserver

import (
	"bytes"
	"compress/gzip"
	"html"
	"io"
	"io/ioutil"
	"net/http"
	"strings"

	"github.com/pingcap/log"
	"github.com/shurcooL/httpgzip"
	"go.uber.org/zap"

	"github.com/pingcap/tidb-dashboard/pkg/config"
)

type UpdateContentFunc func(fs http.FileSystem, oldFile http.File, path, newContent string, zippedBytes []byte)

func RewriteAssets(fs http.FileSystem, cfg *config.Config, updater UpdateContentFunc) {
	if fs == nil {
		return
	}

	rewrite := func(assetPath string) {
		f, err := fs.Open(assetPath)
		if err != nil {
			log.Fatal("Asset not found", zap.String("path", assetPath), zap.Error(err))
		}
		defer f.Close()

		bs, err := ioutil.ReadAll(f)
		if err != nil {
			log.Fatal("Failed to read asset", zap.String("path", assetPath), zap.Error(err))
		}
		tmplText := string(bs)
		updated := strings.ReplaceAll(tmplText, "__PUBLIC_PATH_PREFIX__", html.EscapeString(cfg.PublicPathPrefix))

		var b bytes.Buffer
		w := gzip.NewWriter(&b)
		if _, err := w.Write([]byte(updated)); err != nil {
			log.Fatal("Failed to zip asset", zap.Error(err))
		}
		if err := w.Close(); err != nil {
			log.Fatal("Failed to zip asset", zap.Error(err))
		}

		updater(fs, f, assetPath, updated, b.Bytes())
	}

	rewrite("/index.html")
	rewrite("/diagnoseReport.html")
}

func Handler(root http.FileSystem) http.Handler {
	if root != nil {
		return httpgzip.FileServer(root, httpgzip.FileServerOptions{IndexHTML: true})
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.WriteString(w, "Dashboard UI is not built. Use `UI=1 make`.\n")
	})
}
