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
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jinzhu/gorm"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/dbstore"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/tidb"
)

type Service struct {
	config        *config.Config
	db            *dbstore.DB
	tidbForwarder *tidb.Forwarder
}

type ReportRes struct {
	ReportId uint `json:"report_id"`
}

type DiagnoseReport struct {
	gorm.Model
	Content string
}

func NewService(config *config.Config, tidbForwarder *tidb.Forwarder, db *dbstore.DB) *Service {
	db.AutoMigrate(&DiagnoseReport{})
	return &Service{config: config, db: db, tidbForwarder: tidbForwarder}
}

func (s *Service) Register(r *gin.RouterGroup, auth *user.AuthService) {
	endpoint := r.Group("/diagnose")
	endpoint.POST("/reports", auth.MWAuthRequired(), utils.MWConnectTiDB(s.tidbForwarder), s.genReportHandler)
	endpoint.GET("/reports/:id", s.reportHandler)
}

// @Summary SQL diagnosis report
// @Description Generate sql diagnosis report
// @Produce html
// @Param start_time query string true "start time of the report"
// @Param end_time query string true "end time of the report"
// @Success 200 {object} diagnose_report.ReportRes
// @Router /diagnose/reports [post]
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) genReportHandler(c *gin.Context) {
	// uncomment it to get gorm.DB
	// db := c.MustGet(utils.TiDBConnectionKey).(*gorm.DB)

	dbDSN := fmt.Sprintf("root:%s@tcp(%s)/%s", "", "172.16.5.40:4009", "test")
	// dbDSN := fmt.Sprintf("root:%s@tcp(%s)/%s", "", "127.0.0.1:4000", "test")
	db, err := sql.Open("mysql", dbDSN)
	if err != nil {
		c.String(http.StatusBadRequest, "%v", err)
		return
	}
	db.SetMaxOpenConns(10)
	defer db.Close()

	// startTime := "2020-02-25 13:20:23"
	// endTime := "2020-02-26 13:30:23"
	startTime := c.Query("start_time")
	endTime := c.Query("end_time")
	if startTime == "" || endTime == "" {
		_ = c.Error(fmt.Errorf("invalid begin_time or end_time"))
		return
	}
	tables := []*TableDef{}
	table, err := GetTotalErrorTable(startTime, endTime, db)
	if err != nil {
		_ = c.Error(err)
		return
	}
	tables = append(tables, table)
	table, err = GetTiDBGCConfigInfo(startTime, endTime, db)
	if err != nil {
		_ = c.Error(err)
		return
	}
	tables = append(tables, table)
	table, err = GetTiKVErrorTable(startTime, endTime, db)
	if err != nil {
		_ = c.Error(err)
		return
	}
	tables = append(tables, table)

	content, err := json.Marshal(tables)
	if err != nil {
		_ = c.Error(err)
		return
	}
	// will remove later
	// log.Println(string(content))
	report := DiagnoseReport{Content: string(content)}
	if err := s.db.Create(&report).Error; err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, ReportRes{ReportId: report.ID})
}

// @Summary SQL diagnosis report
// @Description Get sql diagnosis report
// @Produce html
// @Param id path string true "report id"
// @Success 200 {string} string
// @Router /diagnose/reports/{id} [get]
func (s *Service) reportHandler(c *gin.Context) {
	reportId := c.Param("id")
	var report DiagnoseReport
	if err := s.db.First(&report, reportId).Error; err != nil {
		_ = c.Error(err)
		return
	}
	// will remove later
	// log.Println(report.Content)
	var tables []*TableDef
	json.Unmarshal([]byte(report.Content), &tables)
	c.HTML(http.StatusOK, "sql-diagnosis/index", tables)
}
