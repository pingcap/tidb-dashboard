// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package topsql

import (
	"bytes"
	"encoding/json"
	"net"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/joomcode/errorx"
	"go.uber.org/fx"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/pkg/pd"
	"github.com/pingcap/tidb-dashboard/pkg/tidb"
	"github.com/pingcap/tidb-dashboard/pkg/tikv"
	"github.com/pingcap/tidb-dashboard/pkg/utils/topology"
	"github.com/pingcap/tidb-dashboard/util/featureflag"
	"github.com/pingcap/tidb-dashboard/util/rest"
)

var ErrNS = errorx.NewNamespace("error.api.topsql")

type ServiceParams struct {
	fx.In
	TiDBClient *tidb.Client
	NgmProxy   *utils.NgmProxy
	PDClient   *pd.Client
	TiKVClient *tikv.Client
}

type Service struct {
	FeatureTopSQL *featureflag.FeatureFlag

	params ServiceParams
}

func newService(p ServiceParams, ff *featureflag.Registry) *Service {
	return &Service{params: p, FeatureTopSQL: ff.Register("topsql", ">= 5.4.0")}
}

func registerRouter(r *gin.RouterGroup, auth *user.AuthService, s *Service) {
	endpoint := r.Group("/topsql")
	endpoint.Use(
		auth.MWAuthRequired(),
		s.FeatureTopSQL.VersionGuard(),
		utils.MWConnectTiDB(s.params.TiDBClient),
	)
	{
		endpoint.GET("/config", s.GetConfig)
		endpoint.POST("/config", auth.MWRequireWritePriv(), s.UpdateConfig)
		endpoint.GET("/tikv_network_io_collection", s.GetTiKVNetworkIOCollection)
		endpoint.POST(
			"/tikv_network_io_collection",
			auth.MWRequireWritePriv(),
			s.UpdateTiKVNetworkIOCollection,
		)
		endpoint.GET("/instances", s.params.NgmProxy.Route("/topsql/v1/instances"))
		endpoint.GET("/summary", s.params.NgmProxy.Route("/topsql/v1/summary"))
	}
}

type GetInstancesRequest struct {
	Start      string `json:"start"`
	End        string `json:"end"`
	DataSource string `json:"data_source"`
}

type InstanceResponse struct {
	Data []InstanceItem `json:"data"`
}

type InstanceItem struct {
	Instance     string `json:"instance"`
	InstanceType string `json:"instance_type"`
}

// @Summary Get availiable instances
// @Router /topsql/instances [get]
// @Security JwtAuth
// @Param q query GetInstancesRequest true "Query"
// @Success 200 {object} InstanceResponse "ok"
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
func (s *Service) GetInstance(_ *gin.Context) {
	// dummy, for generate open api
}

type GetSummaryRequest struct {
	Instance     string `json:"instance"`
	InstanceType string `json:"instance_type"`
	Start        string `json:"start"`
	End          string `json:"end"`
	Top          string `json:"top"`
	GroupBy      string `json:"group_by"`
	OrderBy      string `json:"order_by"`
	Window       string `json:"window"`
	DataSource   string `json:"data_source"`
}

type SummaryResponse struct {
	Data   []SummaryItem   `json:"data"`
	DataBy []SummaryByItem `json:"data_by"`
}

type SummaryItem struct {
	SQLDigest         string            `json:"sql_digest"`
	SQLText           string            `json:"sql_text"`
	IsOther           bool              `json:"is_other"`
	CPUTimeMs         uint64            `json:"cpu_time_ms"`
	ExecCountPerSec   float64           `json:"exec_count_per_sec"`
	DurationPerExecMs float64           `json:"duration_per_exec_ms"`
	ScanRecordsPerSec float64           `json:"scan_records_per_sec"`
	ScanIndexesPerSec float64           `json:"scan_indexes_per_sec"`
	NetworkBytes      uint64            `json:"network_bytes"`
	LogicalIoBytes    uint64            `json:"logical_io_bytes"`
	Plans             []SummaryPlanItem `json:"plans"`
}

type SummaryByItem struct {
	Text              string   `json:"text"`
	TimestampSec      []uint64 `json:"timestamp_sec"`
	CPUTimeMs         []uint64 `json:"cpu_time_ms,omitempty"`
	CPUTimeMsSum      uint64   `json:"cpu_time_ms_sum"`
	NetworkBytes      []uint64 `json:"network_bytes,omitempty"`
	NetworkBytesSum   uint64   `json:"network_bytes_sum"`
	LogicalIoBytes    []uint64 `json:"logical_io_bytes,omitempty"`
	LogicalIoBytesSum uint64   `json:"logical_io_bytes_sum"`
}

type SummaryPlanItem struct {
	PlanDigest        string   `json:"plan_digest"`
	PlanText          string   `json:"plan_text"`
	TimestampSec      []uint64 `json:"timestamp_sec"`
	CPUTimeMs         []uint64 `json:"cpu_time_ms,omitempty"`
	ExecCountPerSec   float64  `json:"exec_count_per_sec"`
	DurationPerExecMs float64  `json:"duration_per_exec_ms"`
	ScanRecordsPerSec float64  `json:"scan_records_per_sec"`
	ScanIndexesPerSec float64  `json:"scan_indexes_per_sec"`
	NetworkBytes      []uint64 `json:"network_bytes"`
	LogicalIoBytes    []uint64 `json:"logical_io_bytes"`
}

// @Summary Get summaries
// @Router /topsql/summary [get]
// @Security JwtAuth
// @Param q query GetSummaryRequest true "Query"
// @Success 200 {object} SummaryResponse "ok"
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
func (s *Service) GetSummary(_ *gin.Context) {
	// dummy, for generate open api
}

type EditableConfig struct {
	Enable bool `json:"enable" gorm:"column:tidb_enable_top_sql"`
}

// @Summary Get Top SQL config
// @Router /topsql/config [get]
// @Security JwtAuth
// @Success 200 {object} EditableConfig "ok"
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
func (s *Service) GetConfig(c *gin.Context) {
	db := utils.GetTiDBConnection(c)
	cfg := &EditableConfig{}
	err := db.Raw("SELECT @@GLOBAL.tidb_enable_top_sql as tidb_enable_top_sql").Find(cfg).Error
	if err != nil {
		rest.Error(c, err)
		return
	}
	c.JSON(http.StatusOK, cfg)
}

// @Summary Update Top SQL config
// @Router /topsql/config [post]
// @Param request body EditableConfig true "Request body"
// @Security JwtAuth
// @Success 204 {object} string
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
func (s *Service) UpdateConfig(c *gin.Context) {
	var cfg EditableConfig
	if err := c.ShouldBindJSON(&cfg); err != nil {
		rest.Error(c, rest.ErrBadRequest.NewWithNoMessage())
		return
	}

	db := utils.GetTiDBConnection(c)
	err := db.Exec("SET @@GLOBAL.tidb_enable_top_sql = @Enable", &cfg).Error
	if err != nil {
		rest.Error(c, err)
		return
	}

	c.Status(http.StatusNoContent)
}

const tikvNetworkIoCollectionKey = "resource-metering.enable-network-io-collection"

type TikvNetworkIoCollectionConfig struct {
	Enable       bool `json:"enable"`
	IsMultiValue bool `json:"is_multi_value,omitempty"`
}

type UpdateTikvNetworkIoCollectionResponse struct {
	Warnings []rest.ErrorResponse `json:"warnings"`
}

// @ID topsqlGetTiKVNetworkIOCollection
// @Summary Get TiKV network IO collection config
// @Router /topsql/tikv_network_io_collection [get]
// @Security JwtAuth
// @Success 200 {object} TikvNetworkIoCollectionConfig "ok"
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
func (s *Service) GetTiKVNetworkIOCollection(c *gin.Context) {
	tikvInfo, _, err := topology.FetchStoreTopology(s.params.PDClient)
	if err != nil {
		rest.Error(c, err)
		return
	}
	if len(tikvInfo) == 0 {
		c.JSON(http.StatusOK, &TikvNetworkIoCollectionConfig{Enable: false})
		return
	}

	var (
		successes  = 0
		failures   = 0
		firstSet   = false
		firstValue = false
		isMulti    = false
		allTrue    = true
	)

	for _, kvStore := range tikvInfo {
		data, err := s.params.TiKVClient.SendGetRequest(kvStore.IP, int(kvStore.StatusPort), "/config")
		if err != nil {
			failures++
			isMulti = true
			continue
		}
		v, found, err := parseNestedBoolByDotPath(data, tikvNetworkIoCollectionKey)
		if err != nil {
			failures++
			isMulti = true
			continue
		}
		// Treat missing as false (i.e. not enabled / not supported / not present)
		if !found {
			v = false
			isMulti = true
		}

		successes++
		if !v {
			allTrue = false
		}
		if !firstSet {
			firstSet = true
			firstValue = v
		} else if v != firstValue {
			isMulti = true
		}
	}

	if successes == 0 {
		rest.Error(c, errorx.IllegalState.New("Failed to fetch config from any TiKV node"))
		return
	}
	if failures > 0 {
		// Be conservative: if some nodes are unreachable, don't claim "enabled on all nodes".
		allTrue = false
		isMulti = true
	}

	c.JSON(http.StatusOK, &TikvNetworkIoCollectionConfig{
		Enable:       allTrue,
		IsMultiValue: isMulti,
	})
}

// @ID topsqlUpdateTiKVNetworkIOCollection
// @Summary Update TiKV network IO collection config
// @Param request body TikvNetworkIoCollectionConfig true "Request body"
// @Router /topsql/tikv_network_io_collection [post]
// @Security JwtAuth
// @Success 200 {object} UpdateTikvNetworkIoCollectionResponse "ok"
// @Failure 400 {object} rest.ErrorResponse
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
func (s *Service) UpdateTiKVNetworkIOCollection(c *gin.Context) {
	var cfg TikvNetworkIoCollectionConfig
	if err := c.ShouldBindJSON(&cfg); err != nil {
		rest.Error(c, rest.ErrBadRequest.NewWithNoMessage())
		return
	}

	tikvInfo, _, err := topology.FetchStoreTopology(s.params.PDClient)
	if err != nil {
		rest.Error(c, err)
		return
	}

	body := map[string]interface{}{
		tikvNetworkIoCollectionKey: cfg.Enable,
	}
	bodyJSON, err := json.Marshal(&body)
	if err != nil {
		rest.Error(c, err)
		return
	}

	failures := make([]error, 0)
	for _, kvStore := range tikvInfo {
		_, err := s.params.TiKVClient.SendPostRequest(
			kvStore.IP,
			int(kvStore.StatusPort),
			"/config",
			bytes.NewBuffer(bodyJSON),
		)
		if err != nil {
			failures = append(
				failures,
				errorx.Decorate(err, "Failed to edit config for TiKV instance `%s`", net.JoinHostPort(kvStore.IP, strconv.Itoa(int(kvStore.Port)))),
			)
		}
	}

	if len(failures) == len(tikvInfo) && len(failures) > 0 {
		rest.Error(c, failures[0])
		return
	}

	warnings := make([]rest.ErrorResponse, 0)
	for _, err := range failures {
		warnings = append(warnings, rest.NewErrorResponse(err))
	}
	c.JSON(http.StatusOK, &UpdateTikvNetworkIoCollectionResponse{Warnings: warnings})
}

func parseNestedBoolByDotPath(data []byte, dotPath string) (value bool, found bool, err error) {
	var m map[string]interface{}
	if err := json.Unmarshal(data, &m); err != nil {
		return false, false, err
	}
	cur := interface{}(m)
	for _, p := range splitDotPath(dotPath) {
		obj, ok := cur.(map[string]interface{})
		if !ok {
			return false, false, nil
		}
		next, ok := obj[p]
		if !ok {
			return false, false, nil
		}
		cur = next
	}

	switch v := cur.(type) {
	case bool:
		return v, true, nil
	case string:
		// Be tolerant if TiKV returns "true"/"false"
		if v == "true" {
			return true, true, nil
		}
		if v == "false" {
			return false, true, nil
		}
		return false, true, nil
	default:
		return false, true, nil
	}
}

func splitDotPath(dotPath string) []string {
	// Avoid importing strings for a single split; keep consistent with other packages.
	parts := make([]string, 0, 4)
	last := 0
	for i := 0; i < len(dotPath); i++ {
		if dotPath[i] == '.' {
			parts = append(parts, dotPath[last:i])
			last = i + 1
		}
	}
	parts = append(parts, dotPath[last:])
	return parts
}
