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

package info

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
)

type Info struct {
	Version    string `json:"version"`
	PDEndPoint string `json:"pd_end_point"`
}

type Service struct {
	config *config.Config
}

func NewService(config *config.Config) *Service {
	return &Service{config: config}
}

func (s *Service) Register(r *gin.RouterGroup) {
	endpoint := r.Group("/info")
	endpoint.GET("/", s.infoHandler)
}

// @Summary Dashboard info
// @Description Get information about the dashboard service.
// @Produce json
// @Success 200 {object} Info
// @Router /info [get]
func (s *Service) infoHandler(c *gin.Context) {
	c.JSON(http.StatusOK, Info{
		PDEndPoint: s.config.PDEndPoint,
	})
}
