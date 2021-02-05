package toolserver

import (
	"github.com/gin-contrib/gzip"
	"github.com/gin-gonic/gin"
	cors "github.com/rs/cors/wrapper/gin"
	"net/http"
)

func getAssetFileHandler(assetPath string, httpHandler http.Handler) gin.HandlerFunc  {
	return func(c *gin.Context) {
		defer func(old string) {
			c.Request.URL.Path = old
		}(c.Request.URL.Path)

		c.Request.URL.Path = assetPath
		httpHandler.ServeHTTP(c.Writer, c.Request)
	}
}

func Handler(uiHandler http.Handler, apiHandler http.Handler) http.Handler {
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(cors.AllowAll())
	r.Use(gzip.Gzip(gzip.DefaultCompression))
	endpoint := r.Group("/dashboard/tools")
	{
		endpoint.GET("/dataviz", getAssetFileHandler("/dashboard/dataViz.html", uiHandler))
	}

	return r
}