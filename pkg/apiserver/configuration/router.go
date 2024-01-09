// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package configuration

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/util/rest"
)

func RegisterRouter(r *gin.RouterGroup, auth *user.AuthService, s *Service) {
	endpoint := r.Group("/configuration")
	endpoint.Use(auth.MWAuthRequired())
	endpoint.Use(utils.MWConnectTiDB(s.params.TiDBClient))
	endpoint.Use(utils.MWForbidByExperimentalFlag(s.params.Config.EnableExperimental))
	endpoint.GET("/all", s.getHandler)
	endpoint.POST("/edit", auth.MWRequireWritePriv(), s.editHandler)
}

// @ID configurationGetAll
// @Summary Get all configurations
// @Success 200 {object} AllConfigItems
// @Router /configuration/all [get]
// @Security JwtAuth
// @Failure 401 {object} rest.ErrorResponse
// @Failure 403 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
func (s *Service) getHandler(c *gin.Context) {
	db := utils.GetTiDBConnection(c)
	r, err := s.getAllConfigItems(db)
	if err != nil {
		rest.Error(c, err)
		return
	}
	c.JSON(http.StatusOK, r)
}

type EditRequest struct {
	Kind     ItemKind    `json:"kind"`
	ID       string      `json:"id"`
	NewValue interface{} `json:"new_value"`
}

type EditResponse struct {
	Warnings []rest.ErrorResponse `json:"warnings"`
}

// @ID configurationEdit
// @Summary Edit a configuration
// @Param request body EditRequest true "Request body"
// @Success 200 {object} EditResponse
// @Router /configuration/edit [post]
// @Security JwtAuth
// @Failure 400 {object} rest.ErrorResponse
// @Failure 401 {object} rest.ErrorResponse
// @Failure 403 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
func (s *Service) editHandler(c *gin.Context) {
	var req EditRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		rest.Error(c, rest.ErrBadRequest.NewWithNoMessage())
		return
	}

	db := utils.GetTiDBConnection(c)
	warnings, err := s.editConfig(db, req.Kind, req.ID, req.NewValue)
	if err != nil {
		rest.Error(c, err)
		return
	}

	var resp EditResponse
	resp.Warnings = warnings

	c.JSON(http.StatusOK, resp)
}
