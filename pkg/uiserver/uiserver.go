// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package uiserver

import (
	"bytes"
	"compress/gzip"
	"encoding/base64"
	"encoding/json"
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
	"github.com/pingcap/tidb-dashboard/util/distro"
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

		distroStrings, _ := json.Marshal(distro.R()) // this will never fail
		updated = strings.ReplaceAll(updated, "__DISTRO_STRINGS_RES__", base64.StdEncoding.EncodeToString(distroStrings))

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

	overrideDistroAssetsRes(fs, cfg, updater)
}

func overrideDistroAssetsRes(fs http.FileSystem, cfg *config.Config, updater UpdateContentFunc) {
	exePath, err := os.Executable()
	if err != nil {
		log.Fatal("Failed to get work dir", zap.Error(err))
	}

	distroResDir := path.Join(path.Dir(exePath), "distro-res")
	info, err := os.Stat(distroResDir)
	if err != nil || !info.IsDir() {
		// just ignore
		return
	}

	override := func(assetName string) {
		assetPath := path.Join("/", "distro-res", assetName)
		targetFile, err := fs.Open(assetPath)
		if err != nil {
			// has no target asset to be overried, skip
			return
		}
		defer targetFile.Close()

		sourceFile, err := os.Open(path.Join(distroResDir, assetName))
		if err != nil {
			log.Fatal("Failed to open source file", zap.String("path", assetName), zap.Error(err))
		}
		defer sourceFile.Close()

		data, err := ioutil.ReadAll(sourceFile)
		if err != nil {
			log.Fatal("Failed to read asset", zap.String("path", assetName), zap.Error(err))
		}

		var b bytes.Buffer
		w := gzip.NewWriter(&b)
		if _, err := w.Write(data); err != nil {
			log.Fatal("Failed to zip asset", zap.Error(err))
		}
		if err := w.Close(); err != nil {
			log.Fatal("Failed to zip asset", zap.Error(err))
		}

		updater(fs, targetFile, assetPath, string(data), b.Bytes())
	}

	// traverse
	files, err := ioutil.ReadDir(distroResDir)
	if err != nil {
		log.Fatal("Failed to read dir", zap.String("dir", distroResDir), zap.Error(err))
	}
	for _, file := range files {
		override(file.Name())
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
