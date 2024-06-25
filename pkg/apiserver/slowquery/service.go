// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package slowquery

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joomcode/errorx"
	"go.uber.org/fx"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/pkg/tidb"
	commonUtils "github.com/pingcap/tidb-dashboard/pkg/utils"
	"github.com/pingcap/tidb-dashboard/util/rest"
)

var (
	ErrNS     = errorx.NewNamespace("error.api.slow_query")
	ErrNoData = ErrNS.NewType("export_no_data")
)

type ServiceParams struct {
	fx.In
	TiDBClient *tidb.Client
	SysSchema  *commonUtils.SysSchema
}

type Service struct {
	params ServiceParams
}

func newService(p ServiceParams) *Service {
	return &Service{params: p}
}

func registerRouter(r *gin.RouterGroup, auth *user.AuthService, s *Service) {
	endpoint := r.Group("/slow_query")
	{
		endpoint.GET("/download", s.downloadHandler)

		endpoint.Use(auth.MWAuthRequired())
		endpoint.Use(utils.MWConnectTiDB(s.params.TiDBClient))
		{
			endpoint.GET("/list", s.getList)
			endpoint.GET("/detail", s.getDetails)

			endpoint.POST("/download/token", s.downloadTokenHandler)

			endpoint.GET("/available_fields", s.getAvailableFields)
		}
	}
}

// @Summary List all slow queries
// @Param q query GetListRequest true "Query"
// @Success 200 {array} Model
// @Router /slow_query/list [get]
// @Security JwtAuth
// @Failure 400 {object} rest.ErrorResponse
// @Failure 401 {object} rest.ErrorResponse
func (s *Service) getList(c *gin.Context) {
	var req GetListRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		rest.Error(c, rest.ErrBadRequest.NewWithNoMessage())
		return
	}

	db := utils.GetTiDBConnection(c)
	results, err := QuerySlowLogList(&req, s.params.SysSchema, db.Table(SlowQueryTable))
	if err != nil {
		rest.Error(c, rest.ErrBadRequest.NewWithNoMessage())
		return
	}

	c.JSON(http.StatusOK, results)
}

// @Summary Get details of a slow query
// @Param q query GetDetailRequest true "Query"
// @Success 200 {object} Model
// @Router /slow_query/detail [get]
// @Security JwtAuth
// @Failure 401 {object} rest.ErrorResponse
func (s *Service) getDetails(c *gin.Context) {
	var req GetDetailRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		rest.Error(c, rest.ErrBadRequest.NewWithNoMessage())
		return
	}

	db := utils.GetTiDBConnection(c)
	result, err := QuerySlowLogDetail(&req, s.params.SysSchema, db.Table(SlowQueryTable))
	if err != nil {
		rest.Error(c, err)
		return
	}

	// generate binary plan json
	//
	// Due to a kernel bug, the binary plan may fail to parse due to
	// encoding issues. Additionally, since the binary plan field is
	// not a required field, we can mask this error.
	//
	// See: https://github.com/pingcap/tidb-dashboard/issues/1515
	if result.BinaryPlan != "" {
		// may failed but it's ok
		result.BinaryPlanText, _ = utils.GenerateBinaryPlanText(db, result.BinaryPlan)
		// may failed but it's ok
		result.BinaryPlanJSON, _ = utils.GenerateBinaryPlanJSON(result.BinaryPlan)

		// reduce response size
		result.BinaryPlan = ""
		result.Plan = ""
	}

	c.JSON(http.StatusOK, *result)
}

// @Router /slow_query/download/token [post]
// @Summary Generate a download token for exported slow query statements
// @Produce plain
// @Param request body GetListRequest true "Request body"
// @Success 200 {string} string "xxx"
// @Security JwtAuth
// @Failure 400 {object} rest.ErrorResponse
// @Failure 401 {object} rest.ErrorResponse
func (s *Service) downloadTokenHandler(c *gin.Context) {
	var req GetListRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		rest.Error(c, rest.ErrBadRequest.NewWithNoMessage())
		return
	}
	fields := []string{}
	if strings.TrimSpace(req.Fields) != "" {
		fields = strings.Split(req.Fields, ",")
	}
	db := utils.GetTiDBConnection(c)
	list, err := QuerySlowLogList(&req, s.params.SysSchema, db.Table(SlowQueryTable))
	if err != nil {
		rest.Error(c, rest.ErrBadRequest.NewWithNoMessage())
		return
	}
	if len(list) == 0 {
		rest.Error(c, ErrNoData.NewWithNoMessage())
		return
	}

	// interface{} tricky
	rawData := make([]interface{}, len(list))
	for i, v := range list {
		rawData[i] = v
	}

	// convert data
	csvData := utils.GenerateCSVFromRaw(rawData, fields, []string{})

	// generate temp file that persist encrypted data
	timeLayout := "0102150405"
	beginTime := time.Unix(int64(req.BeginTime), 0).Format(timeLayout)
	endTime := time.Unix(int64(req.EndTime), 0).Format(timeLayout)
	token, err := utils.ExportCSV(csvData,
		fmt.Sprintf("slowquery_%s_%s_*.csv", beginTime, endTime),
		"slowquery/download")
	if err != nil {
		rest.Error(c, err)
		return
	}
	c.String(http.StatusOK, token)
}

// @Router /slow_query/download [get]
// @Summary Download slow query statements
// @Produce text/csv
// @Param token query string true "download token"
// @Failure 400 {object} rest.ErrorResponse
// @Failure 401 {object} rest.ErrorResponse
func (s *Service) downloadHandler(c *gin.Context) {
	token := c.Query("token")
	utils.DownloadByToken(token, "slowquery/download", c)
}

// @Summary Get available field names
// @Description Get available field names by slowquery table columns
// @Success 200 {array} string
// @Failure 400 {object} rest.ErrorResponse
// @Failure 401 {object} rest.ErrorResponse
// @Security JwtAuth
// @Router /slow_query/available_fields [get]
func (s *Service) getAvailableFields(c *gin.Context) {
	db := utils.GetTiDBConnection(c)
	jsonNames, err := GetAvailableFields(s.params.SysSchema, db)
	if err != nil {
		rest.Error(c, err)
		return
	}

	c.JSON(http.StatusOK, jsonNames)
}
