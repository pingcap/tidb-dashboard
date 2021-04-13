package files

import (
	"github.com/gin-gonic/gin"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"go.uber.org/fx"
)

type ServiceParams struct {
	fx.In
}

type Service struct {
	params ServiceParams
}

func NewService(p ServiceParams) *Service {
	return &Service{params: p}
}

func RegisterRouter(r *gin.RouterGroup, s *Service) {
	r.GET("/files/:token", s.downloadHandler)
}

// @Router /files/{token} [get]
// @Summary Download files
// @Param token path string true "download token"
// @Failure 400 {object} utils.APIError
func (s *Service) downloadHandler(c *gin.Context) {
	utils.DownloadByToken(c, c.Param("token"))
}
