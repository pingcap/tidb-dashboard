// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package deadlock

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/fx"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/pkg/tidb"
	commonUtils "github.com/pingcap/tidb-dashboard/pkg/utils"
	"github.com/pingcap/tidb-dashboard/util/rest"
)

const (
	DeadlockTable = "INFORMATION_SCHEMA.CLUSTER_DEADLOCKS"
)

type ServiceParams struct {
	fx.In
	TiDBClient *tidb.Client
	SysSchema  *commonUtils.SysSchema
}

type Service struct {
	params ServiceParams
}

func newService(p ServiceParams) *Service {
	return &Service{params: p}
}

func registerRouter(r *gin.RouterGroup, auth *user.AuthService, s *Service) {
	endpoint := r.Group("/deadlock")
	endpoint.Use(
		auth.MWAuthRequired(),
		utils.MWConnectTiDB(s.params.TiDBClient),
	)
	{
		endpoint.GET("/list", s.getList)
	}
}

// @Summary List all deadlock records
// @Success 200 {array} Model
// @Router /deadlock/list [get]
// @Security JwtAuth
// @Failure 400 {object} rest.ErrorResponse
// @Failure 401 {object} rest.ErrorResponse
func (s *Service) getList(c *gin.Context) {
	db := utils.GetTiDBConnection(c)
	var results []Model
	err := db.Table(DeadlockTable).Find(&results).Error
	if err != nil {
		rest.Error(c, rest.ErrBadRequest.NewWithNoMessage())
		return
	}

	c.JSON(http.StatusOK, results)
}
