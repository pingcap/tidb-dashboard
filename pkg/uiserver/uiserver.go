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
	"fmt"
	"html"
	"io"
	"io/fs"
	"net/http"
	"path"
	"strings"

	"github.com/pingcap/log"
	"github.com/pingcap/tidb-dashboard/pkg/config"
	"github.com/shurcooL/httpgzip"
	"go.uber.org/zap"
)

func Assets(cfg *config.Config) http.FileSystem {
	fsys, err := fs.Sub(embededFiles, "ui-build")
	if err != nil {
		panic(err)
	}

	return http.FS(fsys)
}

func Handler(root http.FileSystem, publicPathPrefix string) http.Handler {
	rewrite := func(assetPath string) (string, error) {
		bs, err := embededFiles.ReadFile(path.Join("ui-build", assetPath))
		if err != nil {
			log.Warn("Failed to read asset", zap.String("path", assetPath), zap.Error(err))
			return "", err
		}

		tmplText := string(bs)
		updated := strings.ReplaceAll(tmplText, "__PUBLIC_PATH_PREFIX__", html.EscapeString(publicPathPrefix))
		return updated, nil
	}
	if root != nil {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			url := r.URL.Path
			if url == "/" || url == "diagnoseReport.html" {
				if url == "/" {
					url = "index.html"
				}
				if body, err := rewrite(url); err == nil {
					_, _ = io.WriteString(w, body)
				} else {
					_, _ = io.WriteString(w, fmt.Sprintf("Failed to read asset, error=%s", err.Error()))
				}
			} else {
				httpgzip.FileServer(root, httpgzip.FileServerOptions{IndexHTML: true}).ServeHTTP(w, r)
			}
		})
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.WriteString(w, "Dashboard UI is not built. Use `UI=1 make`.\n")
	})
}
