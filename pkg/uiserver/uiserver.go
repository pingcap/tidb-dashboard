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
	"compress/gzip"
	"io"
	"io/ioutil"
	"net/http"
	"strings"
	"sync"

	assetfs "github.com/elazarl/go-bindata-assetfs"
)

var (
	fs = assetFS()
)

func Handler() http.Handler {
	if fs != nil {
		return NewGzipHandler(fs)
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.WriteString(w, "Dashboard UI is not built. Use `UI=1 make`.\n")
	})
}

func AssetFS() *assetfs.AssetFS {
	return fs
}

type gzipHandler struct {
	raw  http.Handler // The original FileServer
	pool sync.Pool
}

func NewGzipHandler(fs http.FileSystem) http.Handler {
	var pool sync.Pool
	pool.New = func() interface{} {
		gz, err := gzip.NewWriterLevel(ioutil.Discard, gzip.BestSpeed)
		if err != nil {
			panic(err)
		}
		return gz
	}
	return &gzipHandler{raw: http.FileServer(fs), pool: pool}
}

func (g *gzipHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if g.shouldCompress(r) {
		gz := g.pool.Get().(*gzip.Writer)
		defer func() {
			gz.Close()
			gz.Reset(ioutil.Discard)
			g.pool.Put(gz)
		}()
		gz.Reset(w)
		w.Header().Set("Content-Encoding", "gzip")
		g.raw.ServeHTTP(&gzipWriter{
			ResponseWriter: w,
			writer:         gz,
		}, r)
		return
	}
	g.raw.ServeHTTP(w, r)
}

func (g *gzipHandler) shouldCompress(r *http.Request) bool {
	return strings.Contains(r.Header.Get("Accept-Encoding"), "gzip")
}

type gzipWriter struct {
	http.ResponseWriter
	writer *gzip.Writer
}

func (g *gzipWriter) Write(data []byte) (int, error) {
	return g.writer.Write(data)
}
