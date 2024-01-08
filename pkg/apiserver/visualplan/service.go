// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package visualplan

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/joomcode/errorx"
	"go.uber.org/fx"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/util/featureflag"
	"github.com/pingcap/tidb-dashboard/util/rest"
)

var ErrNS = errorx.NewNamespace("error.api.visualplan")

type ServiceParams struct {
	fx.In
}

type Service struct {
	FeatureVisualPlan *featureflag.FeatureFlag
	params            ServiceParams
}

func newService(p ServiceParams, ff *featureflag.Registry) *Service {
	return &Service{params: p, FeatureVisualPlan: ff.Register("visualplan", ">= 6.2.0")}
}

func registerRouter(r *gin.RouterGroup, auth *user.AuthService, s *Service) {
	endpoint := r.Group("/visualplan")
	endpoint.Use(
		auth.MWAuthRequired(),
		s.FeatureVisualPlan.VersionGuard(),
	)
	{
		endpoint.POST("/generate", s.GenerateVisualPlan)
	}
}

type GenerateVisualPlanRequest struct {
	BinaryPlan string `json:"binary_plan"`
}

// // @Summary Generate VisualPlan
// // @Router /visualplan/generate [post]
// // @Security JwtAuth
// // @Param request body GenerateVisualPlanRequest true "Request body"
// // @Success 200 {object} string
// // @Failure 401 {object} rest.ErrorResponse
// // @Failure 500 {object} rest.ErrorResponse.
func (s *Service) GenerateVisualPlan(c *gin.Context) {
	var bp GenerateVisualPlanRequest
	if err := c.ShouldBindJSON(&bp); err != nil {
		rest.Error(c, err)
		return
	}
	vp, err := utils.GenerateBinaryPlanJSON(bp.BinaryPlan)
	if err != nil {
		rest.Error(c, rest.ErrBadRequest.New("generate visual plan failed: %v", err))
		return
	}
	c.Data(http.StatusOK, gin.MIMEJSON, []byte(vp))
}
