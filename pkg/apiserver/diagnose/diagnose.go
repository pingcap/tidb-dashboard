// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package diagnose

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/pingcap/log"
	"go.uber.org/zap"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/pkg/config"
	"github.com/pingcap/tidb-dashboard/pkg/dbstore"
	"github.com/pingcap/tidb-dashboard/pkg/tidb"
	"github.com/pingcap/tidb-dashboard/pkg/uiserver"
	"github.com/pingcap/tidb-dashboard/util/rest"
)

const (
	timeLayout = "2006-01-02 15:04:05"
)

type Service struct {
	// FIXME: Use fx.In
	config     *config.Config
	db         *dbstore.DB
	tidbClient *tidb.Client
	fileServer http.Handler
}

func NewService(config *config.Config, tidbClient *tidb.Client, db *dbstore.DB, uiAssetFS http.FileSystem) *Service {
	err := autoMigrate(db)
	if err != nil {
		log.Fatal("Failed to initialize database", zap.Error(err))
	}

	return &Service{
		config:     config,
		db:         db,
		tidbClient: tidbClient,
		fileServer: uiserver.Handler(uiAssetFS),
	}
}

func RegisterRouter(r *gin.RouterGroup, auth *user.AuthService, s *Service) {
	endpoint := r.Group("/diagnose")
	endpoint.GET("/reports",
		auth.MWAuthRequired(),
		s.reportsHandler)
	endpoint.POST("/reports",
		auth.MWAuthRequired(),
		utils.MWConnectTiDB(s.tidbClient),
		s.genReportHandler)
	endpoint.GET("/reports/:id/detail", s.reportHTMLHandler)
	endpoint.GET("/reports/:id/data.js", s.reportDataHandler)
	endpoint.GET("/reports/:id/status",
		auth.MWAuthRequired(),
		s.reportStatusHandler)

	endpoint.POST("/diagnosis",
		auth.MWAuthRequired(),
		utils.MWConnectTiDB((s.tidbClient)),
		s.genDiagnosisHandler)
}

type GenerateReportRequest struct {
	StartTime        int64 `json:"start_time"`
	EndTime          int64 `json:"end_time"`
	CompareStartTime int64 `json:"compare_start_time"`
	CompareEndTime   int64 `json:"compare_end_time"`
}

// @Summary SQL diagnosis reports history
// @Description Get sql diagnosis reports history
// @Success 200 {array} Report
// @Router /diagnose/reports [get]
// @Security JwtAuth
// @Failure 401 {object} rest.ErrorResponse
func (s *Service) reportsHandler(c *gin.Context) {
	reports, err := GetReports(s.db)
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, reports)
}

// @Summary SQL diagnosis report
// @Description Generate sql diagnosis report
// @Param request body GenerateReportRequest true "Request body"
// @Success 200 {object} int
// @Router /diagnose/reports [post]
// @Security JwtAuth
// @Failure 400 {object} rest.ErrorResponse
// @Failure 401 {object} rest.ErrorResponse
func (s *Service) genReportHandler(c *gin.Context) {
	var req GenerateReportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		_ = c.Error(rest.ErrBadRequest.NewWithNoMessage())
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

	db := utils.TakeTiDBConnection(c)

	go func() {
		defer utils.CloseTiDBConnection(db) //nolint:errcheck

		var tables []*TableDef
		if compareStartTime == nil || compareEndTime == nil {
			tables = GetReportTablesForDisplay(startTime.Format(timeLayout), endTime.Format(timeLayout), db, s.db, reportID)
		} else {
			tables = GetCompareReportTablesForDisplay(
				compareStartTime.Format(timeLayout), compareEndTime.Format(timeLayout),
				startTime.Format(timeLayout), endTime.Format(timeLayout),
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
// @Param id path string true "report id"
// @Success 200 {object} Report
// @Router /diagnose/reports/{id}/status [get]
// @Security JwtAuth
// @Failure 401 {object} rest.ErrorResponse
func (s *Service) reportStatusHandler(c *gin.Context) {
	id := c.Param("id")
	report, err := GetReport(s.db, id)
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, &report)
}

// @Summary SQL diagnosis report
// @Description Get sql diagnosis report HTML
// @Produce html
// @Param id path string true "report id"
// @Success 200 {string} string
// @Router /diagnose/reports/{id}/detail [get]
func (s *Service) reportHTMLHandler(c *gin.Context) {
	defer func(old string) {
		c.Request.URL.Path = old
	}(c.Request.URL.Path)

	c.Request.URL.Path = "diagnoseReport.html"
	s.fileServer.ServeHTTP(c.Writer, c.Request)
}

// @Summary SQL diagnosis report data
// @Description Get sql diagnosis report data
// @Produce text/javascript
// @Param id path string true "report id"
// @Success 200 {string} string
// @Router /diagnose/reports/{id}/data.js [get]
func (s *Service) reportDataHandler(c *gin.Context) {
	id := c.Param("id")
	report, err := GetReport(s.db, id)
	if err != nil {
		_ = c.Error(err)
		return
	}

	data := "window.__diagnosis_data__ = " + report.Content
	c.Data(http.StatusOK, "text/javascript", []byte(data))
}

type GenDiagnosisReportRequest struct {
	StartTime int64  `json:"start_time"`
	EndTime   int64  `json:"end_time"`
	Kind      string `json:"kind"` // values: config, error, performance
}

// @Summary SQL diagnosis report
// @Description Generate sql diagnosis report
// @Produce json
// @Param request body GenDiagnosisReportRequest true "Request body"
// @Success 200 {object} TableDef
// @Router /diagnose/diagnosis [post]
// @Security JwtAuth
// @Failure 401 {object} rest.ErrorResponse
func (s *Service) genDiagnosisHandler(c *gin.Context) {
	var req GenDiagnosisReportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		_ = c.Error(rest.ErrBadRequest.WrapWithNoMessage(err))
		return
	}

	startTime := time.Unix(req.StartTime, 0)
	endTime := time.Unix(req.EndTime, 0)

	var rules []string
	switch req.Kind {
	case "config":
		rules = []string{"config", "version"}
	case "error":
		rules = []string{"critical-error"}
	case "performance":
		rules = []string{"node-load", "threshold-check"}
	}

	db := utils.TakeTiDBConnection(c)
	defer utils.CloseTiDBConnection(db) //nolint:errcheck
	table, err := GetDiagnoseReport(startTime.Format(timeLayout), endTime.Format(timeLayout), db, rules)
	if err != nil {
		tableErr := TableRowDef{Values: []string{CategoryDiagnose, "diagnose", err.Error()}}
		table = *GenerateReportError([]TableRowDef{tableErr})
	}
	c.JSON(http.StatusOK, table)
}
