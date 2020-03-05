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
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gin-gonic/gin/render"

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

type ProgressRes struct {
	Progress int `json:"progress"`
}

func NewService(config *config.Config, tidbForwarder *tidb.Forwarder, db *dbstore.DB, t *template.Template) *Service {
	Migrate(db)
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
	endpoint.GET("/reports/:id/status",
		auth.MWAuthRequired(),
		apiutils.MWConnectTiDB(s.tidbForwarder),
		s.reportStatusHandler)
}

// @Summary SQL diagnosis report
// @Description Generate sql diagnosis report
// @Produce json
// @Param start_time query string true "start time of the report"
// @Param end_time query string true "end time of the report"
// @Success 200 {object} diagnose.ReportRes
// @Router /diagnose/reports [post]
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) genReportHandler(c *gin.Context) {
	db := apiutils.TakeTiDBConnection(c)
	startTimeStr := c.Query("start_time")
	endTimeStr := c.Query("end_time")
	if startTimeStr == "" || endTimeStr == "" {
		_ = c.Error(fmt.Errorf("invalid begin_time or end_time"))
		return
	}

	startTime, err := time.Parse("2006-01-02 15:04:05", startTimeStr)
	if err != nil {
		_ = c.Error(err)
		return
	}
	endTime, err := time.Parse("2006-01-02 15:04:05", endTimeStr)
	if err != nil {
		_ = c.Error(err)
		return
	}

	reportID, err := NewReport(s.db, startTime, endTime)
	if err != nil {
		_ = c.Error(err)
		return
	}

	go func() {
		defer db.Close()

		//tables := GetReportTablesForDisplay(startTimeStr, endTimeStr, db)
		tables := GetReportTablesForDisplay(startTimeStr, endTimeStr, db, s.db, reportID)
		_ = UpdateReportProgress(s.db, reportID, 100) // will remove later
		content, err := json.Marshal(tables)
		if err == nil {
			_ = SaveReportContent(s.db, reportID, string(content))
		}
	}()

	c.JSON(http.StatusOK, ReportRes{ReportID: reportID})
}

// @Summary Diagnosis report status
// @Description Get diagnosis report status
// @Produce json
// @Param id path string true "report id"
// @Success 200 {object} diagnose.Report
// @Router /diagnose/reports/{id}/status [get]
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) reportStatusHandler(c *gin.Context) {
	id := c.Param("id")
	reportID, err := strconv.Atoi(id)
	if err != nil {
		_ = c.Error(err)
		return
	}

	report, err := GetReport(s.db, uint(reportID))
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, &report)
}

// @Summary SQL diagnosis report
// @Description Get sql diagnosis report
// @Produce html
// @Param id path string true "report id"
// @Success 200 {string} string
// @Router /diagnose/reports/{id} [get]
func (s *Service) reportHandler(c *gin.Context) {
	id := c.Param("id")
	reportID, err := strconv.Atoi(id)
	if err != nil {
		_ = c.Error(err)
		return
	}

	report, err := GetReport(s.db, uint(reportID))
	if err != nil {
		_ = c.Error(err)
		return
	}

	if len(report.Content) == 0 {
		c.String(http.StatusOK, "The report is in generating, please referesh it later")
		return
	}

	var tables []*TableDef
	err = json.Unmarshal([]byte(report.Content), &tables)
	if err != nil {
		_ = c.Error(err)
		return
	}
	utils.HTML(c, s.htmlRender, http.StatusOK, "sql-diagnosis/index", tables)
}
