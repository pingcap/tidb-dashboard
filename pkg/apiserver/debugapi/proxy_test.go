package debugapi

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/debugapi/schema"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
	"github.com/stretchr/testify/assert"
)

var endpointAPI schema.EndpointAPI = schema.EndpointAPI{
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
	Query: []schema.EndpointAPIParam{},
}

func Test_proxy_query_ok(t *testing.T) {
	gin.SetMode(gin.TestMode)
	proxy := newProxy()

	w := httptest.NewRecorder()
	r, _ := http.NewRequest("GET", fmt.Sprintf("http://%s", endpointAPI.ID), nil)
	q := r.URL.Query()
	q.Add("id", endpointAPI.ID)
	q.Add("host", "127.0.0.1:10080")
	q.Add("db", "test")
	q.Add("table", "users")
	r.URL.RawQuery = q.Encode()

	proxy.setupEndpoint(endpointAPI)
	proxy.server.ServeHTTP(w, r)

	assert.Equal(t, 200, w.Code)
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
