//+build dev

package diagnose

import (
	"log"
	"net/http"
	"os"
	"strings"
)

func getDiagnosisAssetsPath() string {
	path, err := os.Getwd()
	if err != nil {
		log.Println(err)
	}
	var assetsPath string
	if strings.HasSuffix(path, "tidb-dashboard") {
		// dev mode
		assetsPath = path + "/ui/packages/diagnosis_report/build"
	} else if strings.HasSuffix(path, "diagnose") {
		// work with `go generate ./pkg/apiserver/diagnose` in the project root folder
		assetsPath = path + "/../../../ui/packages/diagnosis_report/build"
	}
	return assetsPath
}

// relative path only works in dev mode, can't work by `go generate ./pkg/apiserver/diagnose`
// var Vfs http.FileSystem = http.Dir("ui/packages/diagnosis_report/build")

var Vfs http.FileSystem = http.Dir(getDiagnosisAssetsPath())
