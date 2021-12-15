// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package uiserver

import (
	"bytes"
	"compress/gzip"
	"encoding/base64"
	"encoding/json"
	"errors"
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

const (
	distroResFolderName = "distro-res"
)

type UpdateContentFunc func(fs http.FileSystem, oldFile http.File, path, newContent string, zippedBytes []byte)

func RewriteAssets(fs http.FileSystem, cfg *config.Config, distroResFolderPath string, updater UpdateContentFunc) {
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

	overrideDistroAssetsRes(fs, distroResFolderPath, updater)
}

func overrideDistroAssetsRes(fs http.FileSystem, distroResFolderPath string, updater UpdateContentFunc) {
	info, err := os.Stat(distroResFolderPath)
	if errors.Is(err, os.ErrNotExist) || !info.IsDir() {
		// just ignore if the folder doesn't exist or it's not a folder
		return
	}
	if err != nil {
		log.Fatal("Failed to stat dir", zap.String("dir", distroResFolderPath), zap.Error(err))
	}

	// traverse
	files, err := ioutil.ReadDir(distroResFolderPath)
	if err != nil {
		log.Fatal("Failed to read dir", zap.String("dir", distroResFolderPath), zap.Error(err))
	}
	for _, file := range files {
		overrideSingleDistroAsset(fs, distroResFolderPath, file.Name(), updater)
	}
}

func overrideSingleDistroAsset(fs http.FileSystem, distroResFolderPath, assetName string, updater UpdateContentFunc) {
	assetPath := path.Join("/", distroResFolderName, assetName)
	targetFile, err := fs.Open(assetPath)
	if err != nil {
		// has no target asset to be overried, skip
		return
	}
	defer targetFile.Close()

	assetFullPath := path.Join(distroResFolderPath, assetName)
	sourceFile, err := os.Open(assetFullPath)
	if err != nil {
		log.Fatal("Failed to open source file", zap.String("file", assetFullPath), zap.Error(err))
	}
	defer sourceFile.Close()

	data, err := ioutil.ReadAll(sourceFile)
	if err != nil {
		log.Fatal("Failed to read asset", zap.String("file", assetFullPath), zap.Error(err))
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

func Handler(root http.FileSystem) http.Handler {
	if root != nil {
		return httpgzip.FileServer(root, httpgzip.FileServerOptions{IndexHTML: true})
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.WriteString(w, "Dashboard UI is not built. Use `UI=1 make`.\n")
	})
}
