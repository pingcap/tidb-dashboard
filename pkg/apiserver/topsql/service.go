// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package topsql

import (
	"bytes"
	"encoding/json"
	"net"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

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
	Start string `json:"start"`
	End   string `json:"end"`
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
	Window       string `json:"window"`
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
	Plans             []SummaryPlanItem `json:"plans"`
}

type SummaryByItem struct {
	Text         string   `json:"text"`
	TimestampSec []uint64 `json:"timestamp_sec"`
	CPUTimeMs    []uint64 `json:"cpu_time_ms,omitempty"`
	CPUTimeMsSum uint64   `json:"cpu_time_ms_sum"`
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

const (
	tikvNetworkIoCollectionKey = "resource-metering.enable-network-io-collection"

	tikvNetworkIoCollectionNodeTimeout    = 3 * time.Second
	tikvNetworkIoCollectionMaxConcurrency = 10
)

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

	type getResult struct {
		value bool
		found bool
		err   error
	}

	concurrency := getTiKVNetworkIoCollectionConcurrency(len(tikvInfo))
	taskChan := make(chan topology.StoreInfo, len(tikvInfo))
	resultChan := make(chan getResult, len(tikvInfo))
	var wg sync.WaitGroup

	for i := 0; i < concurrency; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for kvStore := range taskChan {
				data, err := s.params.TiKVClient.
					WithTimeout(tikvNetworkIoCollectionNodeTimeout).
					SendGetRequest(kvStore.IP, int(kvStore.StatusPort), "/config")
				if err != nil {
					resultChan <- getResult{err: err}
					continue
				}
				v, found, err := parseNestedBoolByDotPath(data, tikvNetworkIoCollectionKey)
				if err != nil {
					resultChan <- getResult{err: err}
					continue
				}
				resultChan <- getResult{value: v, found: found}
			}
		}()
	}

	for _, kvStore := range tikvInfo {
		taskChan <- kvStore
	}
	close(taskChan)
	wg.Wait()
	close(resultChan)

	successes := 0
	failures := 0
	trueCount := 0
	falseCount := 0
	hasMissing := false
	for result := range resultChan {
		if result.err != nil {
			failures++
			continue
		}

		successes++
		// Keep existing semantics: missing key is treated as "false".
		if !result.found {
			hasMissing = true
			falseCount++
			continue
		}
		if result.value {
			trueCount++
		} else {
			falseCount++
		}
	}

	if successes == 0 {
		rest.Error(c, errorx.IllegalState.New("Failed to fetch config from any TiKV node"))
		return
	}

	// Keep existing semantics:
	// 1. Any failed request means "not enabled on all nodes".
	// 2. Missing config key is treated as false and marks multi-value.
	allTrue := failures == 0 && !hasMissing && falseCount == 0
	isMulti := failures > 0 || hasMissing || (trueCount > 0 && falseCount > 0)

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

	type postResult struct {
		target string
		err    error
	}

	concurrency := getTiKVNetworkIoCollectionConcurrency(len(tikvInfo))
	taskChan := make(chan topology.StoreInfo, len(tikvInfo))
	resultChan := make(chan postResult, len(tikvInfo))
	var wg sync.WaitGroup

	for i := 0; i < concurrency; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for kvStore := range taskChan {
				target := net.JoinHostPort(kvStore.IP, strconv.Itoa(int(kvStore.Port)))
				_, err := s.params.TiKVClient.
					WithTimeout(tikvNetworkIoCollectionNodeTimeout).
					SendPostRequest(
						kvStore.IP,
						int(kvStore.StatusPort),
						"/config",
						bytes.NewBuffer(bodyJSON),
					)
				resultChan <- postResult{target: target, err: err}
			}
		}()
	}

	for _, kvStore := range tikvInfo {
		taskChan <- kvStore
	}
	close(taskChan)
	wg.Wait()
	close(resultChan)

	failures := make([]error, 0)
	failedStores := make([]string, 0)
	for result := range resultChan {
		if result.err == nil {
			continue
		}
		failedStores = append(failedStores, result.target)
		failures = append(
			failures,
			errorx.Decorate(result.err, "Failed to edit config for TiKV instance `%s`", result.target),
		)
	}

	if len(failures) == len(tikvInfo) && len(failures) > 0 {
		sort.Strings(failedStores)
		rest.Error(c, errorx.Decorate(
			failures[0],
			"Failed to edit config for all TiKV instances: %s",
			strings.Join(failedStores, ", "),
		))
		return
	}

	sort.Slice(failures, func(i, j int) bool {
		return failures[i].Error() < failures[j].Error()
	})

	warnings := make([]rest.ErrorResponse, 0)
	for _, err := range failures {
		warnings = append(warnings, rest.NewErrorResponse(err))
	}
	c.JSON(http.StatusOK, &UpdateTikvNetworkIoCollectionResponse{Warnings: warnings})
}

func getTiKVNetworkIoCollectionConcurrency(tikvCount int) int {
	concurrency := tikvCount / 10
	if concurrency < 1 {
		concurrency = 1
	}
	if concurrency > tikvNetworkIoCollectionMaxConcurrency {
		concurrency = tikvNetworkIoCollectionMaxConcurrency
	}
	return concurrency
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
