package diagnose

import (
	"html/template"
	"net/http"

	"github.com/gin-gonic/gin/render"
)

func loadGlobFromVfs(fs http.FileSystem, originTemplate *template.Template) render.HTMLRender {
	return HTTPFsHTMLDebug{
		Fs:       fs,
		Glob:     "*.gohtml",
		template: originTemplate,
	}
}

func init() {
	switch Vfs.(type) {
	default:

	case http.Dir:
	}
}
