package diagnose

import (
	"html/template"
	"net/http"

	"github.com/pingcap/log"

	"github.com/gin-gonic/gin/render"
	"github.com/shurcooL/httpfs/html/vfstemplate"
	"go.uber.org/zap"
)

// like gin.HTMLDebug but supports http.FileSystem
type HTTPFsHTMLDebug struct {
	Fs       http.FileSystem
	Glob     string
	template *template.Template
}

func (h HTTPFsHTMLDebug) Instance(name string, data interface{}) render.Render {
	return render.HTML{
		Template: h.loadTemplate(),
		Name:     name,
		Data:     data,
	}
}
func (h HTTPFsHTMLDebug) loadTemplate() *template.Template {
	result, err := vfstemplate.ParseGlob(h.Fs, nil, h.Glob)
	if err != nil {
		log.Fatal("Failed to load template ", zap.String("pattern", h.Glob), zap.Error(err))
	}
	return result
}
