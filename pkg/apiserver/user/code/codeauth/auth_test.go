// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package codeauth

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user/code"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/util/featureflag"
	"github.com/pingcap/tidb-dashboard/util/rest"
)

type testSSOValidator struct{ valid bool }

func (v *testSSOValidator) IsSessionValid(*utils.SessionUser) bool { return v.valid }

func TestRevokedSSOSharingCodeCannotMintOrUseSession(t *testing.T) {
	gin.SetMode(gin.TestMode)
	validator := &testSSOValidator{valid: true}
	sharing := code.NewService()
	sharingCode := sharing.SharingCodeFromSession(&utils.SessionUser{
		Version: utils.SessionVersion, IsShareable: true, HasTiDBAuth: true,
		TiDBUsername: "root", SSOConfigRevision: "authorized-config",
	}, time.Hour, false)
	require.NotNil(t, sharingCode)
	auth := user.NewAuthService(featureflag.NewRegistry("999.999.999"))
	auth.RegisterAuthenticator(typeID, &Authenticator{sharingCodeService: sharing, ssoService: validator})
	engine := gin.New()
	engine.Use(rest.ErrorHandlerFn())
	engine.POST("/login", auth.LoginHandler)
	engine.GET("/protected", auth.MWAuthRequired(), func(c *gin.Context) { c.Status(http.StatusNoContent) })
	login := func() *httptest.ResponseRecorder {
		body, err := json.Marshal(user.AuthenticateForm{Type: typeID, Password: *sharingCode})
		require.NoError(t, err)
		req := httptest.NewRequest(http.MethodPost, "/login", strings.NewReader(string(body)))
		req.Header.Set("Content-Type", "application/json")
		resp := httptest.NewRecorder()
		engine.ServeHTTP(resp, req)
		return resp
	}
	resp := login()
	require.Equal(t, http.StatusOK, resp.Code, resp.Body.String())
	var token user.TokenResponse
	require.NoError(t, json.Unmarshal(resp.Body.Bytes(), &token))
	access := func() *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodGet, "/protected", nil)
		req.Header.Set("Authorization", "Bearer "+token.Token)
		resp := httptest.NewRecorder()
		engine.ServeHTTP(resp, req)
		return resp
	}
	require.Equal(t, http.StatusNoContent, access().Code)
	validator.valid = false
	// gin-jwt reports a rejected session identity as HTTP 403; the API error is unauthenticated.
	denied := access()
	require.Equal(t, http.StatusForbidden, denied.Code, "an already minted shared session must be revoked")
	require.Contains(t, denied.Body.String(), "common.unauthenticated")
	resp = login()
	require.Equal(t, http.StatusUnauthorized, resp.Code, "the old sharing code must not mint a fresh JWT")
}
