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

package statement

import (
	"encoding/base64"
	"encoding/csv"
	"errors"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"os"
	"reflect"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gtank/cryptopasta"
	"github.com/pingcap/log"
	"go.uber.org/fx"
	"go.uber.org/zap"

	aesctr "github.com/Xeoncross/go-aesctr-with-hmac"

	"gopkg.in/oleiade/reflections.v1"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/tidb"
)

type ServiceParams struct {
	fx.In
	TiDBClient *tidb.Client
}

type Service struct {
	params ServiceParams
}

func NewService(p ServiceParams) *Service {
	return &Service{params: p}
}

func Register(r *gin.RouterGroup, auth *user.AuthService, s *Service) {
	endpoint := r.Group("/statements")
	{
		endpoint.GET("/download", s.downloadHandler)

		endpoint.Use(auth.MWAuthRequired())
		endpoint.Use(utils.MWConnectTiDB(s.params.TiDBClient))
		{
			endpoint.GET("/config", s.configHandler)
			endpoint.POST("/config", s.modifyConfigHandler)
			endpoint.GET("/time_ranges", s.timeRangesHandler)
			endpoint.GET("/stmt_types", s.stmtTypesHandler)
			endpoint.GET("/list", s.listHandler)
			endpoint.GET("/plans", s.plansHandler)
			endpoint.GET("/plan/detail", s.planDetailHandler)

			endpoint.POST("/download/token", s.downloadTokenHandler)
		}
	}
}

// @Summary Get statement configurations
// @Success 200 {object} statement.Config
// @Router /statements/config [get]
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) configHandler(c *gin.Context) {
	db := utils.GetTiDBConnection(c)
	cfg, err := QueryStmtConfig(db)
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, cfg)
}

// @Summary Update statement configurations
// @Param request body statement.Config true "Request body"
// @Success 204 {object} string
// @Router /statements/config [post]
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) modifyConfigHandler(c *gin.Context) {
	var req Config
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.MakeInvalidRequestErrorFromError(c, err)
		return
	}
	db := utils.GetTiDBConnection(c)
	err := UpdateStmtConfig(db, &req)
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.Status(http.StatusNoContent)
}

// @Summary Get available statement time ranges
// @Success 200 {array} statement.TimeRange
// @Router /statements/time_ranges [get]
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) timeRangesHandler(c *gin.Context) {
	db := utils.GetTiDBConnection(c)
	timeRanges, err := QueryTimeRanges(db)
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, timeRanges)
}

// @Summary Get all statement types
// @Success 200 {array} string
// @Router /statements/stmt_types [get]
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) stmtTypesHandler(c *gin.Context) {
	db := utils.GetTiDBConnection(c)
	stmtTypes, err := QueryStmtTypes(db)
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, stmtTypes)
}

type GetStatementsRequest struct {
	Schemas   []string `json:"schemas" form:"schemas"`
	StmtTypes []string `json:"stmt_types" form:"stmt_types"`
	BeginTime int      `json:"begin_time" form:"begin_time"`
	EndTime   int      `json:"end_time" form:"end_time"`
	Text      string   `json:"text" form:"text"`
	Fields    string   `json:"fields" form:"fields"`
}

// @Summary Get a list of statements
// @Param q query GetStatementsRequest true "Query"
// @Success 200 {array} Model
// @Router /statements/list [get]
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) listHandler(c *gin.Context) {
	var req GetStatementsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		utils.MakeInvalidRequestErrorFromError(c, err)
		return
	}
	db := utils.GetTiDBConnection(c)
	fields := []string{}
	if strings.TrimSpace(req.Fields) != "" {
		fields = strings.Split(req.Fields, ",")
	}
	overviews, err := QueryStatements(
		db,
		req.BeginTime, req.EndTime,
		req.Schemas,
		req.StmtTypes,
		req.Text,
		fields)
	if err != nil {
		_ = c.Error(err)
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
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) plansHandler(c *gin.Context) {
	var req GetPlansRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		utils.MakeInvalidRequestErrorFromError(c, err)
		return
	}
	db := utils.GetTiDBConnection(c)
	plans, err := QueryPlans(db, req.BeginTime, req.EndTime, req.SchemaName, req.Digest)
	if err != nil {
		_ = c.Error(err)
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
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) planDetailHandler(c *gin.Context) {
	var req GetPlanDetailRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		utils.MakeInvalidRequestErrorFromError(c, err)
		return
	}
	db := utils.GetTiDBConnection(c)
	result, err := QueryPlanDetail(db, req.BeginTime, req.EndTime, req.SchemaName, req.Digest, req.Plans)
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// @Router /statements/download/token [post]
// @Summary Generate a download token for exported statements
// @Produce plain
// @Param request body GetStatementsRequest true "Request body"
// @Success 200 {string} string "xxx"
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) downloadTokenHandler(c *gin.Context) {
	var req GetStatementsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.MakeInvalidRequestErrorFromError(c, err)
		return
	}
	db := utils.GetTiDBConnection(c)
	fields := []string{}
	if strings.TrimSpace(req.Fields) != "" {
		fields = strings.Split(req.Fields, ",")
	}
	overviews, err := QueryStatements(
		db,
		req.BeginTime, req.EndTime,
		req.Schemas,
		req.StmtTypes,
		req.Text,
		fields)
	if err != nil {
		_ = c.Error(err)
		return
	}
	if len(overviews) == 0 {
		utils.MakeInvalidRequestErrorFromError(c, errors.New("no data to export"))
		return
	}

	// convert data
	fieldsMap := make(map[string]string)
	t := reflect.TypeOf(overviews[0])
	fieldsNum := t.NumField()
	allFields := make([]string, fieldsNum)
	for i := 0; i < fieldsNum; i++ {
		field := t.Field(i)
		allFields[i] = strings.ToLower(field.Tag.Get("json"))
		fieldsMap[allFields[i]] = field.Name
	}
	if len(fields) == 1 && fields[0] == "*" {
		fields = allFields
	}

	csvData := [][]string{fields}
	timeLayout := "01-02 15:04:05"
	for _, overview := range overviews {
		row := []string{}
		for _, field := range fields {
			filedName := fieldsMap[field]
			s, _ := reflections.GetField(overview, filedName)
			var val string
			switch t := s.(type) {
			case int:
				if field == "first_seen" || field == "last_seen" {
					val = time.Unix(int64(t), 0).Format(timeLayout)
				} else {
					val = fmt.Sprintf("%d", t)
				}
			default:
				val = fmt.Sprintf("%s", t)
			}
			row = append(row, val)
		}
		csvData = append(csvData, row)
	}

	// generate temp file that persist encrypted data
	timeLayout = "01021504"
	beginTime := time.Unix(int64(req.BeginTime), 0).Format(timeLayout)
	endTime := time.Unix(int64(req.EndTime), 0).Format(timeLayout)
	csvFile, err := ioutil.TempFile("", fmt.Sprintf("statements_%s_%s_*.csv", beginTime, endTime))
	if err != nil {
		_ = c.Error(err)
		return
	}
	defer csvFile.Close()

	// generate encryption key
	secretKey := *cryptopasta.NewEncryptionKey()

	pr, pw := io.Pipe()
	go func() {
		csvwriter := csv.NewWriter(pw)
		_ = csvwriter.WriteAll(csvData)
		pw.Close()
	}()
	err = aesctr.Encrypt(pr, csvFile, secretKey[0:16], secretKey[16:])
	if err != nil {
		_ = c.Error(err)
		return
	}

	// generate token by filepath and secretKey
	secretKeyStr := base64.StdEncoding.EncodeToString(secretKey[:])
	token, err := utils.NewJWTString("statements/download", secretKeyStr+" "+csvFile.Name())
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.String(http.StatusOK, token)
}

// @Router /statements/download [get]
// @Summary Download statements
// @Produce text/csv
// @Param token query string true "download token"
// @Failure 400 {object} utils.APIError
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) downloadHandler(c *gin.Context) {
	token := c.Query("token")
	tokenPlain, err := utils.ParseJWTString("statements/download", token)
	if err != nil {
		utils.MakeInvalidRequestErrorFromError(c, err)
		return
	}
	arr := strings.Fields(tokenPlain)
	if len(arr) != 2 {
		utils.MakeInvalidRequestErrorFromError(c, errors.New("invalid token"))
		return
	}
	secretKey, err := base64.StdEncoding.DecodeString(arr[0])
	if err != nil {
		utils.MakeInvalidRequestErrorFromError(c, err)
		return
	}

	filePath := arr[1]
	fileInfo, err := os.Stat(filePath)
	if err != nil {
		_ = c.Error(err)
		return
	}
	f, err := os.Open(filePath)
	if err != nil {
		_ = c.Error(err)
		return
	}

	c.Writer.Header().Set("Content-type", "text/csv")
	c.Writer.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", fileInfo.Name()))
	err = aesctr.Decrypt(f, c.Writer, secretKey[0:16], secretKey[16:])
	if err != nil {
		log.Error("decrypt csv failed", zap.Error(err))
	}
	// delete it anyway
	f.Close()
	_ = os.Remove(filePath)
}
