// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

// Package authtest exercises routes with real session JWTs and test identities.
package authtest

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/util/featureflag"
	"github.com/pingcap/tidb-dashboard/util/rest"
)

type authenticator struct{ user.BaseAuthenticator }

func (authenticator) Authenticate(form user.AuthenticateForm) (*utils.SessionUser, error) {
	var session utils.SessionUser
	err := json.Unmarshal([]byte(form.Extra), &session)
	return &session, err
}

func New(t *testing.T) *user.AuthService {
	t.Helper()
	gin.SetMode(gin.TestMode)
	auth := user.NewAuthService(featureflag.NewRegistry("999.999.999"))
	for _, kind := range []utils.AuthType{utils.AuthTypeSQL, utils.AuthTypeCode, utils.AuthTypeSSO} {
		auth.RegisterAuthenticator(kind, authenticator{})
	}
	return auth
}

func Token(t *testing.T, auth *user.AuthService, session utils.SessionUser) string {
	t.Helper()
	session.Version = utils.SessionVersion
	extra, err := json.Marshal(session)
	require.NoError(t, err)
	body, err := json.Marshal(user.AuthenticateForm{Type: session.AuthFrom, Extra: string(extra)})
	require.NoError(t, err)
	engine := gin.New()
	engine.Use(rest.ErrorHandlerFn())
	engine.POST("/login", auth.LoginHandler)
	request := httptest.NewRequest(http.MethodPost, "/login", strings.NewReader(string(body)))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	engine.ServeHTTP(response, request)
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var result user.TokenResponse
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &result))
	require.NotEmpty(t, result.Token)
	return result.Token
}
