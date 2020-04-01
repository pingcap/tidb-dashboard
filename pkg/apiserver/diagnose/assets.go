//+build !embed_diagnosis

package diagnose

import (
	"net/http"
)

var Vfs http.FileSystem = http.Dir("ui/packages/diagnosis_report/build")
