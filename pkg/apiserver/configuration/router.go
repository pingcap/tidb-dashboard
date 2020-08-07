// Copyright 2020 PingCAP, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// See the License for the specific language governing permissions and
// limitations under the License.

package configuration

//
//import (
//	"net/http"
//
//	"github.com/gin-gonic/gin"
//
//	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/user"
//	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/utils"
//)
//
//func Register(r *gin.RouterGroup, auth *user.AuthService, s *Service) {
//	endpoint := r.Group("/configuration")
//	endpoint.Use(auth.MWAuthRequired())
//	endpoint.Use(utils.MWConnectTiDB(s.tidbClient))
//	endpoint.Use(utils.MWForbidByExperimentalFlag(s.config.EnableExperimental))
//	endpoint.GET("/all", s.getHandler)
//}
//
//// @ID configurationGetAll
//// @Summary Get all configurations
//// @Produce json
//// @Success 200 {array} Item
//// @Router /configuration/all [get]
//// @Security JwtAuth
//// @Failure 401 {object} utils.APIError "Unauthorized failure"
//// @Failure 403 {object} utils.APIError "Experimental feature not enabled"
//func (s *Service) getHandler(c *gin.Context) {
//	c.JSON(http.StatusOK, gin.H{})
//}
