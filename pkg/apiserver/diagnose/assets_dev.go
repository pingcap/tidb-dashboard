//+build dev

package diagnose

import (
	"net/http"
)

// var Vfs http.FileSystem = http.Dir("ui/packages/diagnosis_report/build")
var Vfs http.FileSystem = http.Dir("/Users/baurine/Codes/Work/pingcap-incubator/tidb-dashboard/ui/packages/diagnosis_report/build")
