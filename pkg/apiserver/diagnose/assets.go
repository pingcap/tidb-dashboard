//+build hot_swap_template

package diagnose

import (
	"net/http"
)

var Vfs http.FileSystem = http.Dir("pkg/apiserver/diagnose/templates")
