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

package foo

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/user"
	// Import for swag go doc
	_ "github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
)

type Service struct {
}

func NewService(config *config.Config) *Service {
	return &Service{}
}

func (s *Service) Register(r *gin.RouterGroup, auth *user.AuthService) {
	endpoint := r.Group("/foo")
	// endpoint.Use(auth.MWAuthRequired())
	endpoint.GET("/bar/:name", auth.MWAuthRequired(), s.greetHandler)
	endpoint.GET("/sql/reports", s.sqlReportHandler)
}

// @Summary Greet
// @Description Hello world!
// @Accept json
// @Produce json
// @Param name path string true "Name"
// @Success 200 {string} string
// @Router /foo/bar/{name} [get]
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) greetHandler(c *gin.Context) {
	name := c.Param("name")
	c.String(http.StatusOK, "Hello %s", name)
}

//////////////////////////

type TableDef struct {
	Category  []string // The category of the table, such as [TiDB]
	Title     string
	CommentEN string   // English Comment
	CommentCN string   // Chinese comment
	Column    []string // Column name
	Rows      []*TableRowDef
}

type TableRowDef struct {
	Values    []string
	SubValues [][]string // SubValues need fold default.
}

var (
	tables = []*TableDef{
		&TableDef{
			Category:  []string{"TiDB Monitor", "Time Cosuming"},
			Title:     "Transaction",
			CommentCN: "",
			CommentEN: "",
			Column:    []string{"type", "total count", "P999", "P99", "P90", "P80"},
			Rows: []*TableRowDef{
				&TableRowDef{
					Values: []string{"txn statement num", "3000", "150", "100", "60", "40"},
				},
				&TableRowDef{
					Values: []string{"txn write keys num", "60000", "", "", "", ""},
				},
				&TableRowDef{
					Values: []string{"txn write regions num", "1000", "", "", "", ""},
				},
				&TableRowDef{
					Values: []string{"load safepoint num", "200", "/", "/", "/", "/"},
					SubValues: [][]string{
						[]string{"", "ok", "200", "", "", ""},
						[]string{"", "fail", "0", "", "", ""},
					},
				},
			},
		},
		&TableDef{
			Category:  []string{"PD Monitor"},
			Title:     "Cluster Status",
			CommentCN: "对比一段时间内集群状态变化",
			CommentEN: "Compare the cluster status changes",
			Column:    []string{"type", "min value", "max value"},
			Rows: []*TableRowDef{
				&TableRowDef{
					Values: []string{"store disconnected count", "0", "1"},
				},
				&TableRowDef{
					Values: []string{"store up count", "4", "5"},
				},
				&TableRowDef{
					Values: []string{"leader count", "21", "739"},
				},
				&TableRowDef{
					Values: []string{"region count", "21", "739"},
				},
			},
		},
	}
)

func (s *Service) sqlReportHandler(c *gin.Context) {
	c.HTML(http.StatusOK, "sql-report/index", tables)
}
