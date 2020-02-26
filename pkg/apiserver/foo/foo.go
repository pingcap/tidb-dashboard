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
	endpoint.GET("/sql-diagnosis", s.sqlDiagnosisHandler)
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
// TODO: move out

type TableDef struct {
	Category  []string // The category of the table, such as [TiDB]
	Title     string
	CommentEN string   // English Comment
	CommentCN string   // Chinese comment
	Column    []string // Column name
	Rows      []TableRowDef
}

type TableRowDef struct {
	Values    []string
	SubValues [][]string // SubValues need fold default.
}

var (
	tables = []*TableDef{
		&TableDef{
			Category: []string{"Report Header"},
			Title:    "Report Time Range",
			Rows: []TableRowDef{
				TableRowDef{
					Values: []string{"start time", "2020-02-13 19:30:00 +08:00"},
				},
				TableRowDef{
					Values: []string{"end time", "2020-02-13 19:40:00 +08:00"},
				},
			},
		},
		&TableDef{
			Title:  "Cluster Typo and Machine Hardware Information",
			Column: []string{"host", "instance", "CPU Cores", "Memory (GB)", "Disk (GB)", "server time"},
			Rows: []TableRowDef{
				TableRowDef{
					Values: []string{"172.16.x.x", "tidb,pd,tikv", "28/56", "128", "/dev/nvme0:1000 /dev/nvme2:2000", "24h"},
				},
				TableRowDef{
					Values: []string{"5.85", "tidb", "", "", "", ""},
				},
			},
		},
		&TableDef{
			Title:  "Version Info",
			Column: []string{"instance", "version", "Git hash"},
			Rows: []TableRowDef{
				TableRowDef{
					Values: []string{"TiDB", "V3.0.8", "xxx"},
				},
				TableRowDef{
					Values: []string{"TiDB", "V3.0.7", "yyy"},
				},
				TableRowDef{
					Values: []string{"TiKV", "V3.0.8", "zzz"},
				},
				TableRowDef{
					Values: []string{"PD", "V3.0.8", "nnn"},
				},
			},
		},
		&TableDef{
			Category: []string{"TiDB Monitor"},
			Title:    "Time Cosuming",
			Column:   []string{"metric name", "metric label", "ratio", "total time", "total count", "p9999", "p99", "p90", "p80"},
			Rows: []TableRowDef{
				TableRowDef{
					Values: []string{"SQL Query", "", "/", "100", "200", "2", "1", "0.8", "0.5"},
					SubValues: [][]string{
						[]string{"", "select", "0.8", "80", "25", "1.5", "0.9", "0.6", "0.4"},
						[]string{"", "insert", "0.1", "10", "", "", "", "", ""},
						[]string{"", "update", "0.05", "5", "", "", "", "", ""},
					},
				},
				TableRowDef{
					Values: []string{"Slow Query", "", "", "20", "10", "", "", "", ""},
				},
				TableRowDef{
					Values: []string{"parse", "", "", "10", "200", "", "", "", ""},
				},
				TableRowDef{
					Values: []string{"pd cmd time", "", "/", "100", "200", "2", "1", "0.8", "0.5"},
					SubValues: [][]string{
						[]string{"", "tso", "0.8", "80", "25", "1.5", "0.9", "0.6", "0.4"},
						[]string{"", "wait", "0.1", "10", "", "", "", "", ""},
						[]string{"", "scan region", "0.05", "5", "", "", "", "", ""},
					},
				},
			},
		},
		&TableDef{
			Title:  "Transaction",
			Column: []string{"", "total count", "P999", "P99", "P90", "P80"},
			Rows: []TableRowDef{
				TableRowDef{
					Values: []string{"txn statement num", "3000", "150", "100", "60", "40"},
				},
				TableRowDef{
					Values: []string{"txn write keys num", "60000", "", "", "", ""},
				},
				TableRowDef{
					Values: []string{"txn write regions num", "1000", "", "", "", ""},
				},
				TableRowDef{
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
			Column:    []string{"", "min value", "max value"},
			Rows: []TableRowDef{
				TableRowDef{
					Values: []string{"store disconnected count", "0", "1"},
				},
				TableRowDef{
					Values: []string{"store up count", "4", "5"},
				},
				TableRowDef{
					Values: []string{"leader count", "21", "739"},
				},
				TableRowDef{
					Values: []string{"region count", "21", "739"},
				},
			},
		},
	}
)

func (s *Service) sqlDiagnosisHandler(c *gin.Context) {
	c.HTML(http.StatusOK, "sql-diagnosis/index", tables)
}
