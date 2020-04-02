//+build dev

package diagnose

import (
	"log"
	"net/http"
	"os"
)

func getWd() string {
	path, err := os.Getwd()
	if err != nil {
		log.Println(err)
	}
	return path
}

// relative path only works in dev mode, can't work by `go generate pkg/apiserver/diagnose/assets_embed.go`
// var Vfs http.FileSystem = http.Dir("ui/packages/diagnosis_report/build")
var Vfs http.FileSystem = http.Dir(getWd() + "/../../../ui/packages/diagnosis_report/build")
