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

package diagnose

import (
	"encoding/json"
	"fmt"
	"html/template"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gin-gonic/gin/render"
	"github.com/jinzhu/gorm"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/user"
	apiutils "github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/dbstore"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/tidb"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/utils"
)

type Service struct {
	config        *config.Config
	db            *dbstore.DB
	tidbForwarder *tidb.Forwarder
	htmlRender    render.HTMLRender
}

type ReportRes struct {
	ReportID uint `json:"report_id"`
}

type Report struct {
	gorm.Model
	Content string
}

func NewService(config *config.Config, tidbForwarder *tidb.Forwarder, db *dbstore.DB, t *template.Template) *Service {
	db.AutoMigrate(&Report{})
	return &Service{
		config:        config,
		db:            db,
		tidbForwarder: tidbForwarder,
		htmlRender:    utils.NewHTMLRender(t, TemplateInfos),
	}
}

func (s *Service) Register(r *gin.RouterGroup, auth *user.AuthService) {
	endpoint := r.Group("/diagnose")
	endpoint.POST("/reports",
		auth.MWAuthRequired(),
		apiutils.MWConnectTiDB(s.tidbForwarder),
		s.genReportHandler)
	endpoint.GET("/reports/:id", s.reportHandler)
}

// @Summary SQL diagnosis report
// @Description Generate sql diagnosis report
// @Produce html
// @Param start_time query string true "start time of the report"
// @Param end_time query string true "end time of the report"
// @Success 200 {object} diagnose.ReportRes
// @Router /diagnose/reports [post]
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) genReportHandler(c *gin.Context) {
	db := c.MustGet(apiutils.TiDBConnectionKey).(*gorm.DB)
	startTime := c.Query("start_time")
	endTime := c.Query("end_time")
	if startTime == "" || endTime == "" {
		_ = c.Error(fmt.Errorf("invalid begin_time or end_time"))
		return
	}

	tables := GetReportTablesForDisplay(startTime, endTime, db)
	content, err := json.Marshal(tables)
	if err != nil {
		_ = c.Error(err)
		return
	}

	report := Report{Content: string(content)}
	if err := s.db.Create(&report).Error; err != nil {
		_ = c.Error(err)
		return
	}

	c.JSON(http.StatusOK, ReportRes{ReportID: report.ID})
}

// @Summary SQL diagnosis report
// @Description Get sql diagnosis report
// @Produce html
// @Param id path string true "report id"
// @Success 200 {string} string
// @Router /diagnose/reports/{id} [get]
func (s *Service) reportHandler(c *gin.Context) {
	reportID := c.Param("id")
	var report Report
	if err := s.db.First(&report, reportID).Error; err != nil {
		_ = c.Error(err)
		return
	}
	var tables []*TableDef
	err := json.Unmarshal([]byte(report.Content), &tables)
	if err != nil {
		_ = c.Error(err)
		return
	}
	utils.HTML(c, s.htmlRender, http.StatusOK, "sql-diagnosis/index", tables)
}
