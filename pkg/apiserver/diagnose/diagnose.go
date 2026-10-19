// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package diagnose

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/goccy/go-graphviz"
	"github.com/pingcap/log"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/pkg/config"
	"github.com/pingcap/tidb-dashboard/pkg/dbstore"
	"github.com/pingcap/tidb-dashboard/pkg/tidb"
	"github.com/pingcap/tidb-dashboard/pkg/uiserver"
	"github.com/pingcap/tidb-dashboard/util/rest"
)

const (
	timeLayout           = "2006-01-02 15:04:05"
	reportTokenIssuer    = "diagnose/report"
	reportActionTokenTTL = 15 * time.Minute
)

var graphvizMutex sync.Mutex

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
	endpoint.GET("/reports/:id/action_token",
		auth.MWAuthRequired(),
		s.reportActionTokenHandler)
	endpoint.GET("/reports/:id/detail", s.reportHTMLHandler)
	endpoint.GET("/reports/:id/data.js", s.reportDataHandler)
	endpoint.GET("/reports/:id/status",
		auth.MWAuthRequired(),
		s.reportStatusHandler)

	endpoint.POST("/metrics_relation/generate", auth.MWAuthRequired(), s.metricsRelationHandler)
	endpoint.GET("/metrics_relation/view", s.metricsRelationViewHandler)

	endpoint.POST("/diagnosis",
		auth.MWAuthRequired(),
		utils.MWConnectTiDB(s.tidbClient),
		s.genDiagnosisHandler)
}

// @Summary Generate an action token for viewing a diagnosis report
// @Produce plain
// @Param id path string true "report id"
// @Success 200 {string} string
// @Router /diagnose/reports/{id}/action_token [get]
// @Security JwtAuth
// @Failure 400 {object} rest.ErrorResponse
// @Failure 401 {object} rest.ErrorResponse
func (s *Service) reportActionTokenHandler(c *gin.Context) {
	id := c.Param("id")
	if _, err := GetReport(s.db, id); errors.Is(err, gorm.ErrRecordNotFound) {
		rest.Error(c, rest.ErrBadRequest.New("Report does not exist"))
		return
	} else if err != nil {
		rest.Error(c, err)
		return
	}

	token, err := utils.NewJWTStringWithExpire(reportTokenIssuer, id, reportActionTokenTTL)
	if err != nil {
		rest.Error(c, err)
		return
	}
	c.Header("Cache-Control", "no-store")
	c.String(http.StatusOK, token)
}

func validateReportActionToken(reportID, token string) error {
	tokenReportID, err := utils.ParseJWTString(reportTokenIssuer, token)
	if err != nil || tokenReportID != reportID {
		return rest.ErrBadRequest.New("Invalid report action token")
	}
	return nil
}

func (s *Service) generateMetricsRelation(startTime, endTime time.Time, graphType string) (string, error) {
	params := url.Values{}
	params.Add("start", startTime.Format(time.RFC3339))
	params.Add("end", endTime.Format(time.RFC3339))
	params.Add("type", graphType)
	encodedParams := params.Encode()

	data, err := s.tidbClient.SendGetRequest("/metrics/profile?" + encodedParams)
	if err != nil {
		return "", err
	}

	file, err := os.CreateTemp("", "metrics*.svg")
	if err != nil {
		return "", fmt.Errorf("failed to create temp file: %v", err)
	}
	_ = file.Close()

	g := graphviz.New()
	// FIXME: should share a global mutex for profiling.
	graphvizMutex.Lock()
	defer graphvizMutex.Unlock()
	graph, err := graphviz.ParseBytes(data)
	if err != nil {
		_ = os.Remove(file.Name())
		return "", fmt.Errorf("failed to parse DOT file: %v", err)
	}

	if err := g.RenderFilename(graph, graphviz.SVG, file.Name()); err != nil {
		_ = os.Remove(file.Name())
		return "", fmt.Errorf("failed to render SVG: %v", err)
	}

	return file.Name(), nil
}

type GenerateMetricsRelationRequest struct {
	StartTime int64  `json:"start_time"`
	EndTime   int64  `json:"end_time"`
	Type      string `json:"type"`
}

// @Id diagnoseGenerateMetricsRelationship
// @Summary Generate metrics relationship graph.
// @Param request body GenerateMetricsRelationRequest true "Request body"
// @Router /diagnose/metrics_relation/generate [post]
// @Success 200 {string} string
// @Security JwtAuth
// @Failure 401 {object} rest.ErrorResponse
func (s *Service) metricsRelationHandler(c *gin.Context) {
	var req GenerateMetricsRelationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		rest.Error(c, rest.ErrBadRequest.NewWithNoMessage())
		return
	}

	startTime := time.Unix(req.StartTime, 0)
	endTime := time.Unix(req.EndTime, 0)

	path, err := s.generateMetricsRelation(startTime, endTime, req.Type)
	if err != nil {
		rest.Error(c, err)
		return
	}

	token, err := utils.NewJWTString("diagnose/metrics", path)
	if err != nil {
		rest.Error(c, err)
		return
	}

	c.JSON(http.StatusOK, token)
}

// @Summary View metrics relationship graph.
// @Produce image/svg
// @Param token query string true "token"
// @Failure 400 {object} rest.ErrorResponse
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
// @Router /diagnose/metrics_relation/view [get]
func (s *Service) metricsRelationViewHandler(c *gin.Context) {
	token := c.Query("token")
	path, err := utils.ParseJWTString("diagnose/metrics", token)
	if err != nil {
		rest.Error(c, rest.ErrBadRequest.NewWithNoMessage())
		return
	}

	data, err := os.ReadFile(filepath.Clean(path))
	if err != nil {
		rest.Error(c, err)
		return
	}

	// Do not remove it? Otherwise the link will just expire..
	// _ = os.Remove(path)

	c.Data(http.StatusOK, "image/svg+xml", data)
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
		rest.Error(c, err)
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
		rest.Error(c, rest.ErrBadRequest.NewWithNoMessage())
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
		rest.Error(c, err)
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
		rest.Error(c, err)
		return
	}
	c.JSON(http.StatusOK, &report)
}

// @Summary SQL diagnosis report
// @Description Get sql diagnosis report HTML
// @Produce html
// @Param id path string true "report id"
// @Param token query string true "report action token"
// @Success 200 {string} string
// @Failure 400 {object} rest.ErrorResponse
// @Router /diagnose/reports/{id}/detail [get]
func (s *Service) reportHTMLHandler(c *gin.Context) {
	if err := validateReportActionToken(c.Param("id"), c.Query("token")); err != nil {
		rest.Error(c, err)
		return
	}
	c.Header("Cache-Control", "no-store")
	c.Header("Referrer-Policy", "no-referrer")

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
// @Param token query string true "report action token"
// @Success 200 {string} string
// @Failure 400 {object} rest.ErrorResponse
// @Router /diagnose/reports/{id}/data.js [get]
func (s *Service) reportDataHandler(c *gin.Context) {
	id := c.Param("id")
	if err := validateReportActionToken(id, c.Query("token")); err != nil {
		rest.Error(c, err)
		return
	}
	report, err := GetReport(s.db, id)
	if err != nil {
		rest.Error(c, err)
		return
	}

	data := "window.__diagnosis_data__ = " + report.Content
	c.Header("Cache-Control", "no-store")
	c.Header("Referrer-Policy", "no-referrer")
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
		rest.Error(c, rest.ErrBadRequest.WrapWithNoMessage(err))
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
