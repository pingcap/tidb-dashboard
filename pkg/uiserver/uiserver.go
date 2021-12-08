// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package uiserver

import (
	"bytes"
	"compress/gzip"
	"fmt"
	"html"
	"io"
	"io/ioutil"
	"net/http"
	"os"
	"path"
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

	rewriteDistroRes(fs, cfg, updater)
}

func rewriteDistroRes(fs http.FileSystem, cfg *config.Config, updater UpdateContentFunc) {
	exePath, err := os.Executable()
	if err != nil {
		log.Fatal("Failed to get work dir", zap.Error(err))
	}

	distroResDir := path.Join(path.Dir(exePath), "distro-res")
	log.Debug("Distro res dir", zap.String("path", distroResDir))
	info, err := os.Stat(distroResDir)
	if err != nil || !info.IsDir() {
		// just ignore
		return
	}
	log.Info("Exist distro resources")
	// traverse
	files, err := ioutil.ReadDir(distroResDir)
	if err != nil {
		log.Fatal("Failed to read dir")
	}
	for _, file := range files {
		fmt.Println(file.Name())

		// check whether needs to override
		f, err := fs.Open("/" + file.Name())
		if err != nil {
			log.Fatal("Asset not found", zap.String("path", file.Name()), zap.Error(err))
			continue
		}
		f.Close()

		f1, err := os.Open(path.Join(distroResDir, file.Name()))
		if err != nil {
			continue
		}
		data, err := ioutil.ReadAll(f1)
		if err != nil {
			continue
		}

		var b bytes.Buffer
		w := gzip.NewWriter(&b)
		if _, err := w.Write(data); err != nil {
			log.Fatal("Failed to zip asset", zap.Error(err))
		}
		if err := w.Close(); err != nil {
			log.Fatal("Failed to zip asset", zap.Error(err))
		}

		updater(fs, f, "/"+file.Name(), string(data), b.Bytes())
	}
}

func Handler(root http.FileSystem) http.Handler {
	if root != nil {
		return httpgzip.FileServer(root, httpgzip.FileServerOptions{IndexHTML: true})
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.WriteString(w, "Dashboard UI is not built. Use `UI=1 make`.\n")
	})
}
