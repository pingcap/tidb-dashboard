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
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gin-gonic/gin/render"
	"go.uber.org/fx"

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

func NewService(lc fx.Lifecycle, config *config.Config, tidbForwarder *tidb.Forwarder, db *dbstore.DB, newTemplate utils.NewTemplateFunc) *Service {
	lc.Append(fx.Hook{
		OnStart: func(context.Context) error {
			Migrate(db)
			return nil
		},
	})

	t := newTemplate("diagnose")

	return &Service{
		config:        config,
		db:            db,
		tidbForwarder: tidbForwarder,
		htmlRender:    utils.NewHTMLRender(t, TemplateInfos),
	}
}

func Register(r *gin.RouterGroup, auth *user.AuthService, s *Service) {
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

type GenerateReportRequest struct {
	StartTime        int64 `json:"start_time"`
	EndTime          int64 `json:"end_time"`
	CompareStartTime int64 `json:"compare_start_time"`
	CompareEndTime   int64 `json:"compare_end_time"`
}

// @Summary SQL diagnosis report
// @Description Generate sql diagnosis report
// @Produce json
// @Param request body GenerateReportRequest true "Request body"
// @Success 200 {object} int
// @Router /diagnose/reports [post]
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) genReportHandler(c *gin.Context) {
	var req GenerateReportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.Status(http.StatusBadRequest)
		_ = c.Error(apiutils.ErrInvalidRequest.WrapWithNoMessage(err))
		return
	}

	startTime := time.Unix(req.StartTime, 0)
	endTime := time.Unix(req.EndTime, 0)
	var compareStartTime, compareEndTime *time.Time
	if req.CompareStartTime != 0 && req.CompareEndTime != 0 {
		compareStartTime = new(time.Time)
		compareEndTime = new(time.Time)
		*compareStartTime = time.Unix(req.CompareStartTime, 0)
		*compareEndTime = time.Unix(req.CompareEndTime, 0)
	}

	reportID, err := NewReport(s.db, startTime, endTime, compareStartTime, compareEndTime)
	if err != nil {
		_ = c.Error(err)
		return
	}

	db := apiutils.TakeTiDBConnection(c)

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

	c.JSON(http.StatusOK, reportID)
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
