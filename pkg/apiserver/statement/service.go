// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package statement

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joomcode/errorx"
	"github.com/pingcap/errors"
	"go.uber.org/fx"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/pkg/tidb"
	commonUtils "github.com/pingcap/tidb-dashboard/pkg/utils"
	"github.com/pingcap/tidb-dashboard/util/featureflag"
	"github.com/pingcap/tidb-dashboard/util/rest"
)

var (
	ErrNS     = errorx.NewNamespace("error.api.statement")
	ErrNoData = ErrNS.NewType("export_no_data")
)

type ServiceParams struct {
	fx.In
	TiDBClient *tidb.Client
	SysSchema  *commonUtils.SysSchema
}

type Service struct {
	params                 ServiceParams
	planBindingFeatureFlag *featureflag.FeatureFlag
}

func newService(p ServiceParams, ff *featureflag.Registry) *Service {
	return &Service{params: p, planBindingFeatureFlag: ff.Register("plan_binding", ">= 6.5.0")}
}

func registerRouter(r *gin.RouterGroup, auth *user.AuthService, s *Service) {
	endpoint := r.Group("/statements")
	{
		endpoint.GET("/download", s.downloadHandler)

		endpoint.Use(auth.MWAuthRequired())
		endpoint.Use(utils.MWConnectTiDB(s.params.TiDBClient))
		{
			endpoint.POST("/download/token", s.downloadTokenHandler)

			endpoint.GET("/config", s.configHandler)
			endpoint.POST("/config", auth.MWRequireWritePriv(), s.modifyConfigHandler)
			endpoint.GET("/stmt_types", s.stmtTypesHandler)
			endpoint.GET("/list", s.listHandler)
			endpoint.GET("/plans", s.plansHandler)
			endpoint.GET("/plan/detail", s.planDetailHandler)

			endpoint.GET("/available_fields", s.getAvailableFields)

			binding := endpoint.Group("/plan/binding")
			binding.Use(s.planBindingFeatureFlag.VersionGuard())
			{
				binding.GET("", s.getPlanBindingHandler)
				binding.POST("", s.createPlanBindingHandler)
				binding.DELETE("", s.dropPlanBindingHandler)
			}
		}
	}
}

type EditableConfig struct {
	Enable          bool `json:"enable" gorm:"column:tidb_enable_stmt_summary"`
	RefreshInterval int  `json:"refresh_interval" gorm:"column:tidb_stmt_summary_refresh_interval"`
	HistorySize     int  `json:"history_size" gorm:"column:tidb_stmt_summary_history_size"`
	MaxSize         int  `json:"max_size" gorm:"column:tidb_stmt_summary_max_stmt_count"`
	InternalQuery   bool `json:"internal_query" gorm:"column:tidb_stmt_summary_internal_query"`
}

// @Summary Get statement configurations
// @Success 200 {object} statement.EditableConfig
// @Router /statements/config [get]
// @Security JwtAuth
// @Failure 401 {object} rest.ErrorResponse
func (s *Service) configHandler(c *gin.Context) {
	db := utils.GetTiDBConnection(c)
	cfg := &EditableConfig{}
	err := db.Raw(buildGlobalConfigProjectionSelectSQL(cfg)).Find(cfg).Error
	if err != nil {
		rest.Error(c, err)
		return
	}
	c.JSON(http.StatusOK, cfg)
}

// @Summary Update statement configurations
// @Param request body statement.EditableConfig true "Request body"
// @Success 204 {object} string
// @Router /statements/config [post]
// @Security JwtAuth
// @Failure 401 {object} rest.ErrorResponse
func (s *Service) modifyConfigHandler(c *gin.Context) {
	var config EditableConfig
	if err := c.ShouldBindJSON(&config); err != nil {
		rest.Error(c, rest.ErrBadRequest.NewWithNoMessage())
		return
	}
	db := utils.GetTiDBConnection(c)

	var sqlWithNamedArgument string
	if !config.Enable {
		sqlWithNamedArgument = buildGlobalConfigNamedArgsUpdateSQL(&config, "Enable")
	} else {
		sqlWithNamedArgument = buildGlobalConfigNamedArgsUpdateSQL(&config)
	}
	err := db.Exec(sqlWithNamedArgument, &config).Error
	if err != nil {
		rest.Error(c, err)
		return
	}

	c.Status(http.StatusNoContent)
}

// @Summary Get all statement types
// @Success 200 {array} string
// @Router /statements/stmt_types [get]
// @Security JwtAuth
// @Failure 401 {object} rest.ErrorResponse
func (s *Service) stmtTypesHandler(c *gin.Context) {
	db := utils.GetTiDBConnection(c)
	stmtTypes, err := queryStmtTypes(db)
	if err != nil {
		rest.Error(c, err)
		return
	}
	c.JSON(http.StatusOK, stmtTypes)
}

type GetStatementsRequest struct {
	Schemas        []string `json:"schemas" form:"schemas"`
	ResourceGroups []string `json:"resource_groups" form:"resource_groups"`
	StmtTypes      []string `json:"stmt_types" form:"stmt_types"`
	BeginTime      int      `json:"begin_time" form:"begin_time"`
	EndTime        int      `json:"end_time" form:"end_time"`
	Text           string   `json:"text" form:"text"`
	Fields         string   `json:"fields" form:"fields"`
}

// @Summary Get a list of statements
// @Param q query GetStatementsRequest true "Query"
// @Success 200 {array} Model
// @Router /statements/list [get]
// @Security JwtAuth
// @Failure 400 {object} rest.ErrorResponse
// @Failure 401 {object} rest.ErrorResponse
func (s *Service) listHandler(c *gin.Context) {
	var req GetStatementsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		rest.Error(c, rest.ErrBadRequest.NewWithNoMessage())
		return
	}
	db := utils.GetTiDBConnection(c)
	fields := []string{}
	if strings.TrimSpace(req.Fields) != "" {
		fields = strings.Split(req.Fields, ",")
	}
	overviews, err := s.queryStatements(
		db,
		req.BeginTime, req.EndTime,
		req.Schemas,
		req.ResourceGroups,
		req.StmtTypes,
		req.Text,
		fields)
	if err != nil {
		rest.Error(c, rest.ErrBadRequest.NewWithNoMessage())
		return
	}
	c.JSON(http.StatusOK, overviews)
}

type GetPlansRequest struct {
	SchemaName string `json:"schema_name" form:"schema_name"`
	Digest     string `json:"digest" form:"digest"`
	BeginTime  int    `json:"begin_time" form:"begin_time"`
	EndTime    int    `json:"end_time" form:"end_time"`
}

// @Summary Get execution plans of a statement
// @Param q query GetPlansRequest true "Query"
// @Success 200 {array} Model
// @Router /statements/plans [get]
// @Security JwtAuth
// @Failure 401 {object} rest.ErrorResponse
func (s *Service) plansHandler(c *gin.Context) {
	var req GetPlansRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		rest.Error(c, rest.ErrBadRequest.NewWithNoMessage())
		return
	}
	db := utils.GetTiDBConnection(c)
	plans, err := s.queryPlans(db, req.BeginTime, req.EndTime, req.SchemaName, req.Digest)
	if err != nil {
		rest.Error(c, err)
		return
	}
	c.JSON(http.StatusOK, plans)
}

type GetPlanDetailRequest struct {
	GetPlansRequest
	Plans []string `json:"plans" form:"plans"`
}

// @Summary Get details of a statement in an execution plan
// @Param q query GetPlanDetailRequest true "Query"
// @Success 200 {object} Model
// @Router /statements/plan/detail [get]
// @Security JwtAuth
// @Failure 401 {object} rest.ErrorResponse
func (s *Service) planDetailHandler(c *gin.Context) {
	var req GetPlanDetailRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		rest.Error(c, rest.ErrBadRequest.NewWithNoMessage())
		return
	}
	db := utils.GetTiDBConnection(c)
	result, err := s.queryPlanDetail(db, req.BeginTime, req.EndTime, req.SchemaName, req.Digest, req.Plans)
	if err != nil {
		rest.Error(c, err)
		return
	}

	if result.AggBinaryPlan != "" {
		// may failed but it's ok
		result.BinaryPlanText, _ = utils.GenerateBinaryPlanText(db, result.AggBinaryPlan)
		// may failed but it's ok
		result.BinaryPlanJSON, _ = utils.GenerateBinaryPlanJSON(result.AggBinaryPlan)

		// reduce response size
		result.AggBinaryPlan = ""
		result.AggPlan = ""
	}

	c.JSON(http.StatusOK, result)
}

// @Summary	Get the bound plan digest (if exists) of a statement
// @Param	sql_digest	query	string	true	"query template id"
// @Param	begin_time	query	int	true	"begin time"
// @Param	end_time	query	int	true	"end time"
// @Success	200	{object}	Binding
// @Router	/statements/plan/binding	[get]
// @Security	JwtAuth
// @Failure	401	{object}	rest.ErrorResponse
func (s *Service) getPlanBindingHandler(c *gin.Context) {
	digest := c.Query("sql_digest")
	if digest == "" {
		rest.Error(c, rest.ErrBadRequest.New("sql_digest cannot be empty"))
		return
	}
	bTimeS := c.Query("begin_time")
	bTime, err := strconv.Atoi(bTimeS)
	if err != nil {
		rest.Error(c, rest.ErrBadRequest.New("begin_time is not a valid timestamp second int"))
		return
	}
	eTimeS := c.Query("end_time")
	eTime, err := strconv.Atoi(eTimeS)
	if err != nil {
		rest.Error(c, rest.ErrBadRequest.New("end_time is not a valid timestamp second int"))
		return
	}

	db := utils.GetTiDBConnection(c)
	results, err := s.queryPlanBinding(db, digest, bTime, eTime)
	if err != nil {
		rest.Error(c, err)
		return
	}

	// Creating binding with the same plan digest will override the previous one.
	// Therefore, we only need to return the first result.
	var result *Binding
	if len(results) >= 1 {
		result = &results[0]
	}

	c.JSON(http.StatusOK, result)
}

// @Summary	Create a binding for a statement and a plan
// @Param	plan_digest	query	string	true	"plan digest id"
// @Success	200	{string}	string	"success"
// @Router	/statements/plan/binding	[post]
// @Security	JwtAuth
// @Failure	401	{object}	rest.ErrorResponse
func (s *Service) createPlanBindingHandler(c *gin.Context) {
	digest := c.Query("plan_digest")
	if digest == "" {
		rest.Error(c, rest.ErrBadRequest.New("plan_digest cannot be empty"))
		return
	}

	db := utils.GetTiDBConnection(c)
	err := s.createPlanBinding(db, digest)
	if err != nil {
		rest.Error(c, errors.Annotate(err, "create plan binding failed due to internal failure, please refer to https://docs.pingcap.com/tidb/stable/sql-plan-management"))
		return
	}

	c.String(http.StatusOK, "success")
}

// @Summary	Drop all manually created bindings for a statement
// @Param	sql_digest	query	string	true	"query template ID (a.k.a. sql digest)"
// @Success	200	{string}	string	"success"
// @Router	/statements/plan/binding	[delete]
// @Security	JwtAuth
// @Failure	401	{object}	rest.ErrorResponse
func (s *Service) dropPlanBindingHandler(c *gin.Context) {
	digest := c.Query("sql_digest")
	if digest == "" {
		rest.Error(c, rest.ErrBadRequest.New("sql_digest cannot be empty"))
		return
	}

	db := utils.GetTiDBConnection(c)
	err := s.dropPlanBinding(db, digest)
	if err != nil {
		rest.Error(c, err)
		return
	}

	c.String(http.StatusOK, "success")
}

// @Router /statements/download/token [post]
// @Summary Generate a download token for exported statements
// @Produce plain
// @Param request body GetStatementsRequest true "Request body"
// @Success 200 {string} string "xxx"
// @Security JwtAuth
// @Failure 400 {object} rest.ErrorResponse
// @Failure 401 {object} rest.ErrorResponse
func (s *Service) downloadTokenHandler(c *gin.Context) {
	var req GetStatementsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		rest.Error(c, rest.ErrBadRequest.NewWithNoMessage())
		return
	}
	db := utils.GetTiDBConnection(c)
	fields := []string{}
	if strings.TrimSpace(req.Fields) != "" {
		fields = strings.Split(req.Fields, ",")
	}
	overviews, err := s.queryStatements(
		db,
		req.BeginTime, req.EndTime,
		req.Schemas,
		req.ResourceGroups,
		req.StmtTypes,
		req.Text,
		fields)
	if err != nil {
		rest.Error(c, rest.ErrBadRequest.NewWithNoMessage())
		return
	}
	if len(overviews) == 0 {
		rest.Error(c, ErrNoData.NewWithNoMessage())
		return
	}

	// interface{} tricky
	rawData := make([]interface{}, len(overviews))
	for i, v := range overviews {
		rawData[i] = v
	}

	// convert data
	csvData := utils.GenerateCSVFromRaw(rawData, fields, []string{"first_seen", "last_seen"})

	// generate temp file that persist encrypted data
	timeLayout := "01021504"
	beginTime := time.Unix(int64(req.BeginTime), 0).Format(timeLayout)
	endTime := time.Unix(int64(req.EndTime), 0).Format(timeLayout)
	token, err := utils.ExportCSV(csvData,
		fmt.Sprintf("statements_%s_%s_*.csv", beginTime, endTime),
		"statements/download")
	if err != nil {
		rest.Error(c, err)
		return
	}
	c.String(http.StatusOK, token)
}

// @Router /statements/download [get]
// @Summary Download statements
// @Produce text/csv
// @Param token query string true "download token"
// @Failure 400 {object} rest.ErrorResponse
// @Failure 401 {object} rest.ErrorResponse
func (s *Service) downloadHandler(c *gin.Context) {
	token := c.Query("token")
	utils.DownloadByToken(token, "statements/download", c)
}

// @Summary Get available field names
// @Description Get available field names by statements table columns
// @Success 200 {array} string
// @Failure 401 {object} rest.ErrorResponse
// @Security JwtAuth
// @Router /statements/available_fields [get]
func (s *Service) getAvailableFields(c *gin.Context) {
	db := utils.GetTiDBConnection(c)
	cs, err := s.params.SysSchema.GetTableColumnNames(db, statementsTable)
	if err != nil {
		rest.Error(c, err)
		return
	}

	fields := filterFieldsByColumns(getFieldsAndTags(), cs)
	jsonNames := make([]string, 0, len(fields))
	for _, f := range fields {
		jsonNames = append(jsonNames, f.JSONName)
	}

	c.JSON(http.StatusOK, jsonNames)
}
