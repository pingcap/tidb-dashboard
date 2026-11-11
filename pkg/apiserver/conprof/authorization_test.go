// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package conprof

import (
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/internal/authtest"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/util/featureflag"
	"github.com/pingcap/tidb-dashboard/util/rest"
)

func TestConprofReadOnlyActionToken(t *testing.T) {
	registry := featureflag.NewRegistry("999.999.999")
	service := &Service{
		FeatureFlagConprof: registry.Register("conprof", ">= 5.3.0"),
		params:             ServiceParams{NgmProxy: &utils.NgmProxy{}},
	}
	auth := authtest.New(t)
	engine := gin.New()
	engine.Use(rest.ErrorHandlerFn())
	registerRouter(engine.Group("/api"), auth, service)
	query := "ts=123&profile_type=cpu&component=tidb"
	for _, kind := range []utils.AuthType{utils.AuthTypeSQL, utils.AuthTypeCode, utils.AuthTypeSSO} {
		token := authtest.Token(t, auth, utils.SessionUser{AuthFrom: kind, IsWriteable: false})
		request := httptest.NewRequest(http.MethodGet, "/api/continuous_profiling/action_token?q="+url.QueryEscape(query), nil)
		request.Header.Set("Authorization", "Bearer "+token)
		response := httptest.NewRecorder()
		engine.ServeHTTP(response, request)
		require.Equal(t, http.StatusOK, response.Code, response.Body.String())
		payload, err := utils.ParseJWTString("conprof", response.Body.String())
		require.NoError(t, err)
		require.Equal(t, query, payload)
	}
}
