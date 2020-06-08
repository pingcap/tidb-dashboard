package metrics

import (
	"context"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joomcode/errorx"
	"go.etcd.io/etcd/clientv3"
	"go.uber.org/fx"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/utils/topology"
)

var (
	ErrNS                    = errorx.NewNamespace("error.api.metrics")
	ErrPrometheusNotFound    = ErrNS.NewType("prometheus_not_found")
	ErrPrometheusQueryFailed = ErrNS.NewType("prometheus_query_failed")
)

type Service struct {
	ctx context.Context

	httpClient *http.Client
	etcdClient *clientv3.Client
}

func NewService(lc fx.Lifecycle, httpClient *http.Client, etcdClient *clientv3.Client) *Service {
	s := &Service{
		httpClient: httpClient,
		etcdClient: etcdClient,
	}

	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			s.ctx = ctx
			return nil
		},
	})

	return s
}

func Register(r *gin.RouterGroup, auth *user.AuthService, s *Service) {
	endpoint := r.Group("/metrics")
	endpoint.Use(auth.MWAuthRequired())
	endpoint.GET("/query", s.queryHandler)
}

type QueryRequest struct {
	StartTimeSec int    `json:"start_time_sec" form:"start_time_sec"`
	EndTimeSec   int    `json:"end_time_sec" form:"end_time_sec"`
	StepSec      int    `json:"step_sec" form:"step_sec"`
	Query        string `json:"query" form:"query"`
}

type QueryResponse struct {
	Status string                 `json:"status"`
	Data   map[string]interface{} `json:"data"`
}

// @Summary Query metrics
// @Description Query metrics in the given range
// @Produce json
// @Param q query QueryRequest true "Query"
// @Success 200 {object} QueryResponse
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Security JwtAuth
// @Router /metrics/query [get]
func (s *Service) queryHandler(c *gin.Context) {
	var req QueryRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		_ = c.Error(err)
		return
	}

	pi, err := topology.FetchPrometheusTopology(s.ctx, s.etcdClient)
	if err != nil {
		_ = c.Error(err)
		return
	}
	if pi == nil {
		_ = c.Error(ErrPrometheusNotFound.NewWithNoMessage())
		return
	}

	params := url.Values{}
	params.Add("query", req.Query)
	params.Add("start", strconv.Itoa(req.StartTimeSec))
	params.Add("end", strconv.Itoa(req.EndTimeSec))
	params.Add("step", strconv.Itoa(req.StepSec))

	uri := fmt.Sprintf("http://%s:%d/api/v1/query_range?%s", pi.IP, pi.Port, params.Encode())
	promReq, err := http.NewRequestWithContext(s.ctx, http.MethodGet, uri, nil)
	if err != nil {
		_ = c.Error(ErrPrometheusQueryFailed.Wrap(err, "failed to build Prometheus request"))
		return
	}

	newHTTPClient := *s.httpClient
	newHTTPClient.Timeout = 10 * time.Second
	promResp, err := newHTTPClient.Do(promReq)
	if err != nil {
		_ = c.Error(ErrPrometheusQueryFailed.Wrap(err, "failed to send requests to Prometheus"))
		return
	}

	defer promResp.Body.Close()
	if promResp.StatusCode != http.StatusOK {
		_ = c.Error(ErrPrometheusQueryFailed.New("failed to query Prometheus"))
		return
	}

	body, err := ioutil.ReadAll(promResp.Body)
	if err != nil {
		_ = c.Error(ErrPrometheusQueryFailed.Wrap(err, "failed to read Prometheus query result"))
		return
	}

	c.Data(promResp.StatusCode, promResp.Header.Get("content-type"), body)
}
