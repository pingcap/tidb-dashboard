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

const (
	timeLayout = "2006-01-02 15:04:05"
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
// @Param c_start_time query string false "compared start time of the report"
// @Param c_end_time query string false "compared end time of the report"
// @Success 200 {object} diagnose.ReportRes
// @Router /diagnose/reports [post]
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) genReportHandler(c *gin.Context) {
	db := apiutils.TakeTiDBConnection(c)
	startTimeStr := c.Query("start_time")
	endTimeStr := c.Query("end_time")
	compareStartTimeStr := c.Query("c_start_time")
	compareEndTimeStr := c.Query("c_end_time")
	if startTimeStr == "" || endTimeStr == "" {
		_ = c.Error(fmt.Errorf("invalid begin_time or end_time"))
		return
	}

	tsSec, err := strconv.ParseInt(startTimeStr, 10, 64)
	if err != nil {
		_ = c.Error(err)
		return
	}
	startTime := time.Unix(tsSec, 0)

	tsSec, err = strconv.ParseInt(endTimeStr, 10, 64)
	if err != nil {
		_ = c.Error(err)
		return
	}
	endTime := time.Unix(tsSec, 0)

	var compareStartTime, compareEndTime *time.Time
	if compareStartTimeStr != "" {
		tsSec, err = strconv.ParseInt(compareStartTimeStr, 10, 64)
		if err != nil {
			_ = c.Error(err)
			return
		}
		compareStartTime = new(time.Time)
		*compareStartTime = time.Unix(tsSec, 0)
	}
	if compareEndTimeStr != "" {
		tsSec, err = strconv.ParseInt(compareEndTimeStr, 10, 64)
		if err != nil {
			_ = c.Error(err)
			return
		}
		compareEndTime = new(time.Time)
		*compareEndTime = time.Unix(tsSec, 0)
	}

	reportID, err := NewReport(s.db, startTime, endTime, compareStartTime, compareEndTime)
	if err != nil {
		_ = c.Error(err)
		return
	}

	go func() {
		defer db.Close()

		var tables []*TableDef
		if compareStartTime == nil || compareEndTime == nil {
			tables = GetReportTablesForDisplay(startTime.Format(timeLayout), endTime.Format(timeLayout), db, s.db, reportID)
		} else {
			tables = GetCompareReportTablesForDisplay(
				startTime.Format(timeLayout), endTime.Format(timeLayout),
				compareStartTime.Format(timeLayout), compareEndTime.Format(timeLayout),
				db, s.db, reportID)
		}
		_ = UpdateReportProgress(s.db, reportID, 100)
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
