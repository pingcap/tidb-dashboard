// +build ui_server

package uiserver

import (
	"html"
	"strings"
)

func InitAssetFS(prefix string) {
	rewrite := func(assetPath string) {
		a, err := _bindata[assetPath]()
		if err != nil {
			panic("Asset " + assetPath + " not found.")
		}
		tmplText := string(a.bytes)
		updated := strings.ReplaceAll(tmplText, "__DASHBOARD_PREFIX__", html.EscapeString(prefix))
		a.bytes = []byte(updated)
		_bindata[assetPath] = func() (*asset, error) {
			return a, nil
		}
	}
	rewrite("build/index.html")
	rewrite("build/diagnoseReport.html")
}
