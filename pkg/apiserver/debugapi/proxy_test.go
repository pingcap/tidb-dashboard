package debugapi

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/debugapi/schema"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
)

var tidbIPParam schema.EndpointAPIParam = schema.EndpointAPIParam{
	Name:   "tidb_ip",
	Prefix: "{",
	Suffix: "}:10080",
	Model:  schema.EndpointAPIModelIP,
	PostModelTransformer: func(value string) (string, error) {
		return fmt.Sprintf("%s:10080", value), nil
	},
}

var endpointAPI []schema.EndpointAPI = []schema.EndpointAPI{
	{
		ID:        "tidb_config",
		Component: model.NodeKindTiDB,
		Path:      "/settings",
		Method:    http.MethodGet,
		Host:      tidbIPParam,
		Segment:   []schema.EndpointAPISegmentParam{},
		Query:     []schema.EndpointAPIParam{},
	},
	{
		ID:        "test_endpoint",
		Component: model.NodeKindTiDB,
		Path:      "/stats/dump/{db}/{table}",
		Method:    http.MethodGet,
		Host: schema.EndpointAPIParam{
			Name: "host",
		},
		Segment: []schema.EndpointAPISegmentParam{
			schema.NewEndpointAPISegmentParam(schema.EndpointAPIParam{
				Name:  "db",
				Model: schema.EndpointAPIModelText,
			}),
			schema.NewEndpointAPISegmentParam(schema.EndpointAPIParam{
				Name:  "table",
				Model: schema.EndpointAPIModelText,
			}),
		},
	},
}

func Test_proxy_query_ok(t *testing.T) {
	gin.SetMode(gin.TestMode)
	proxy := newProxy()

	w := httptest.NewRecorder()
	r, _ := http.NewRequest("GET", fmt.Sprintf("http://%s", endpointAPI[0].ID), nil)
	q := r.URL.Query()
	q.Add("id", endpointAPI[0].ID)
	q.Add("tidb_ip", "127.0.0.1")
	r.URL.RawQuery = q.Encode()

	for _, e := range endpointAPI {
		proxy.setupEndpoint(e)
	}
	proxy.server.ServeHTTP(w, r)

	// assert.Equal(t, "", w.Body.String())
}

func Test_get_all_endpoint_configs_success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	service := newService()
	router := gin.New()
	router.GET("/endpoint", service.GetEndpointList)

	w := httptest.NewRecorder()
	r, _ := http.NewRequest("GET", "/endpoint", nil)

	router.ServeHTTP(w, r)

	// assert.Equal(t, "", w.Body.String())
}
