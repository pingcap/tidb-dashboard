// Copyright 2021 Suhaha
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package topsql

import (
	"github.com/gin-gonic/gin"
	"github.com/joomcode/errorx"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
)

var (
	ErrNS = errorx.NewNamespace("error.api.top_sql")
)

type Service struct {
	ngm *utils.NgmProxy
}

func newService(ngm *utils.NgmProxy) *Service {
	return &Service{ngm: ngm}
}

func registerRouter(r *gin.RouterGroup, auth *user.AuthService, s *Service) {
	endpoint := r.Group("/top_sql")
	endpoint.Use(auth.MWAuthRequired())
	{
		endpoint.GET("/instances", s.ngm.Route("/topsql/v1/instances"))
		endpoint.GET("/cpu_time", s.ngm.Route("/topsql/v1/cpu_time"))
	}
}

type InstanceResponse struct {
	Data []InstanceItem `json:"data"`
}

type InstanceItem struct {
	Instance     string `json:"instance"`
	InstanceType string `json:"instance_type"`
}

// @Summary Get availiable instances
// @Router /top_sql/instances [get]
// @Security JwtAuth
// @Success 200 {object} InstanceResponse "ok"
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Failure 500 {object} utils.APIError
func (s *Service) getInstance(c *gin.Context) {
	// dummy, for generate open api
}

type GetCPUTimeRequest struct {
	Instance string `json:"instance"`
	Start    string `json:"start"`
	End      string `json:"end"`
	Top      string `json:"top"`
	Window   string `json:"window"`
}
type CPUTimeResponse struct {
	Data []TopSQLItem `json:"data"`
}
type TopSQLItem struct {
	SQLDigest string     `json:"sql_digest"`
	SQLText   string     `json:"sql_text"`
	Plans     []PlanItem `json:"plans"`
}
type PlanItem struct {
	PlanDigest    string   `json:"plan_digest"`
	PlanText      string   `json:"plan_text"`
	TimestampSecs []uint64 `json:"timestamp_secs"`
	CPUTimeMillis []uint32 `json:"cpu_time_millis"`
}

// @Summary Get cpu time
// @Router /top_sql/cpu_time [get]
// @Security JwtAuth
// @Param q query GetCPUTimeRequest true "Query"
// @Success 200 {object} CPUTimeResponse "ok"
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Failure 500 {object} utils.APIError
func (s *Service) getCpuTime(c *gin.Context) {
	// dummy, for generate open api
}
