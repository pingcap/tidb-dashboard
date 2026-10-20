// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package sso

import (
	"encoding/json"
	"errors"
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
	"github.com/pingcap/tidb-dashboard/pkg/config"
	"github.com/pingcap/tidb-dashboard/util/featureflag"
	"github.com/pingcap/tidb-dashboard/util/rest"
)

func TestSQLWriterCanClearUnavailableDelegation(t *testing.T) {
	s, store := newTestService(t)
	p := newTestProvider(t)
	req := p.request()
	req.Config.ClientSecret = "old-client-secret"
	_, err := s.saveConfig(req)
	require.NoError(t, err)
	session, err := s.NewSessionFromOAuthExchange("http://dashboard/callback", "code", "verifier")
	require.NoError(t, err)
	sharing := code.NewService()
	sharingCode := sharing.SharingCodeFromSession(session, time.Hour, false)
	require.NotNil(t, sharingCode)
	shared := sharing.NewSessionFromSharingCode(*sharingCode)
	require.NotNil(t, shared)

	// The previous SQL user no longer exists. A reader or stale writer must not
	// clear the delegation; another freshly verified writer can only destroy it.
	s.verifySQLUser = func(name, password string) (bool, error) {
		if name == "operator" && password == "operator-password" {
			return true, nil
		}
		if name == "reader" && password == "reader-password" {
			return false, nil
		}
		return false, errors.New("invalid or deleted SQL account")
	}
	req.SQLUser, req.Password = "operator", "operator-password"
	_, err = s.saveConfig(req)
	require.Error(t, err, "another writer cannot replace an enabled privileged delegation")
	req.Config.Enabled = false
	for _, credentials := range []struct{ name, password string }{
		{"root", "root-password"}, {"operator", "wrong"}, {"reader", "reader-password"},
	} {
		req.SQLUser, req.Password = credentials.name, credentials.password
		_, err = s.saveConfig(req)
		require.Error(t, err)
		require.True(t, s.IsSessionValid(session))
	}
	req.SQLUser, req.Password = "operator", "operator-password"
	_, err = s.saveConfig(req)
	require.NoError(t, err)
	require.False(t, s.IsSessionValid(session))
	require.False(t, s.IsSessionValid(shared))
	dc, err := store.Get()
	require.NoError(t, err)
	require.Equal(t, config.SSOCoreConfig{}, dc.SSO.CoreConfig)
	var count int64
	require.NoError(t, s.params.LocalStore.Model(&SSOImpersonationModel{}).Count(&count).Error)
	require.Zero(t, count)
	_, err = s.NewSessionFromOAuthExchange("http://dashboard/callback", "code", "verifier")
	require.Error(t, err)

	// Re-enabling requires fresh authorization for the new account; old root
	// credentials, client secrets, sessions, and codes are not inherited.
	req.Config = p.request().Config
	_, err = s.saveConfig(req)
	require.NoError(t, err)
	name, password, err := s.getAndDecryptImpersonation(store.dc.SSO.Revision)
	require.NoError(t, err)
	require.Equal(t, "operator", name)
	require.Equal(t, "operator-password", password)
	require.False(t, s.IsSessionValid(session))
	require.False(t, s.IsSessionValid(shared))
}

func TestClearSSORequiresCurrentSQLSessionCredentials(t *testing.T) {
	gin.SetMode(gin.TestMode)
	s, _ := newTestService(t)
	p := newTestProvider(t)
	_, err := s.saveConfig(p.request())
	require.NoError(t, err)
	auth := user.NewAuthService(featureflag.NewRegistry("999.999.999"))
	auth.RegisterAuthenticator(utils.AuthTypeSQL, &testManagementAuthenticator{sqlUser: "operator"})
	engine := gin.New()
	engine.Use(rest.ErrorHandlerFn())
	engine.POST("/login", auth.LoginHandler)
	registerRouter(engine.Group(""), auth, s)
	login := httptest.NewRequest(http.MethodPost, "/login", strings.NewReader(`{"type":0}`))
	login.Header.Set("Content-Type", "application/json")
	resp := httptest.NewRecorder()
	engine.ServeHTTP(resp, login)
	require.Equal(t, http.StatusOK, resp.Code)
	var token user.TokenResponse
	require.NoError(t, json.Unmarshal(resp.Body.Bytes(), &token))

	for _, tc := range []struct {
		name, password string
		status         int
	}{
		{"root", "root-password", http.StatusForbidden},
		{"operator", "wrong", http.StatusBadRequest},
		{"operator", "operator-password", http.StatusOK},
	} {
		body, err := json.Marshal(SetConfigRequest{SQLUser: tc.name, Password: tc.password})
		require.NoError(t, err)
		req := httptest.NewRequest(http.MethodPut, "/user/sso/config", strings.NewReader(string(body)))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+token.Token)
		resp := httptest.NewRecorder()
		engine.ServeHTTP(resp, req)
		require.Equal(t, tc.status, resp.Code, resp.Body.String())
	}
}
