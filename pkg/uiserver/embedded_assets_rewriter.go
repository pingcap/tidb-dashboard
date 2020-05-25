// +build ui_server

package uiserver

import (
	"bytes"
	"compress/gzip"
	"html"
	"io/ioutil"
	"strings"
)

func InitAssetFS(prefix string) {
	rewrite := func(assetPath string) {
		f, err := assets.Open(assetPath)
		if err != nil {
			panic("Asset " + assetPath + " not found.")
		}
		defer f.Close()
		bs, err := ioutil.ReadAll(f)
		if err != nil {
			panic("Read Asset " + assetPath + " fail.")
		}
		tmplText := string(bs)
		updated := strings.ReplaceAll(tmplText, "__PUBLIC_PATH_PREFIX__", html.EscapeString(prefix))

		var b bytes.Buffer
		w := gzip.NewWriter(&b)
		w.Write([]byte(updated))
		w.Close()

		fs := assets.(vfsgen۰FS)
		oldFile := f.(*vfsgen۰CompressedFile)
		fs[assetPath] = &vfsgen۰CompressedFileInfo{
			name:              oldFile.name,
			modTime:           oldFile.modTime,
			uncompressedSize:  int64(len(updated)),
			compressedContent: b.Bytes(),
		}
	}
	rewrite("/index.html")
	rewrite("/diagnoseReport.html")
}
