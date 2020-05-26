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

	"github.com/shurcooL/httpgzip"
)

func AssetFS() http.FileSystem {
	return assets
}

func Handler(root http.FileSystem) http.Handler {
	if root != nil {
		return httpgzip.FileServer(root, httpgzip.FileServerOptions{IndexHTML: true})
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.WriteString(w, "Dashboard UI is not built. Use `UI=1 make`.\n")
	})
}


type UpdateContentFunc func(fs http.FileSystem, oldFile http.File, path, newContent string, zippedBytes []byte)

func RewriteAssets(publicPath string, fs http.FileSystem, updater UpdateContentFunc) {
	if fs == nil {
		return
	}
	rewrite := func(assetPath string) {
		f, err := fs.Open(assetPath)
		if err != nil {
			panic("Asset " + assetPath + " not found.")
		}
		defer f.Close()
		bs, err := ioutil.ReadAll(f)
		if err != nil {
			panic("Read Asset " + assetPath + " fail.")
		}
		tmplText := string(bs)
		updated := strings.ReplaceAll(tmplText, "__PUBLIC_PATH_PREFIX__", html.EscapeString(publicPath))

		var b bytes.Buffer
		w := gzip.NewWriter(&b)
		w.Write([]byte(updated))
		w.Close()

		updater(fs, f, assetPath, updated, b.Bytes())
	}
	rewrite("/index.html")
	rewrite("/diagnoseReport.html")
}
