// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package sso

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v4"
	"github.com/stretchr/testify/require"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/pkg/config"
	"github.com/pingcap/tidb-dashboard/util/rest"
)

func TestSettingsSavePreservesRedactedClientSecret(t *testing.T) {
	for _, legacy := range []bool{false, true} {
		name := "current config"
		if legacy {
			name = "upgrade reauthorization"
		}
		t.Run(name, func(t *testing.T) {
			gin.SetMode(gin.TestMode)
			s, store := newTestService(t)
			p := newTestProvider(t)
			p.mu.Lock()
			p.signingAlgs = []string{"HS256"}
			p.clientSecret = testClientSecret
			p.token = signHMACToken(t, p, jwt.SigningMethodHS256, []byte(testClientSecret), nil)
			p.mu.Unlock()
			req := p.request()
			req.Config.ClientSecret = testClientSecret
			_, err := s.saveConfig(req)
			require.NoError(t, err)
			oldSession, err := s.NewSessionFromOAuthExchange("http://dashboard/callback", "code", "verifier")
			require.NoError(t, err)
			if legacy {
				require.NoError(t, store.Modify(func(dc *config.DynamicConfig) {
					dc.SSO.Issuer = ""
					dc.SSO.Revision = ""
				}))
				require.NoError(t, s.params.LocalStore.Model(&SSOImpersonationModel{}).
					Where("sql_user = ?", "root").Update("config_revision", "").Error)
			}
			// Use the actual redacted settings response as the next form submission.
			resp := httptest.NewRecorder()
			ctx, _ := gin.CreateTestContext(resp)
			s.getConfig(ctx)
			require.NoError(t, json.Unmarshal(resp.Body.Bytes(), &req.Config))
			require.Empty(t, req.Config.ClientSecret)
			require.NotContains(t, resp.Body.String(), testClientSecret)
			req.Config.IsReadOnly = true
			_, err = s.saveConfig(req)
			require.NoError(t, err)
			dc, err := store.Get()
			require.NoError(t, err)
			require.Equal(t, testClientSecret, dc.SSO.CoreConfig.ClientSecret)
			require.False(t, s.IsSessionValid(oldSession))
			session, err := s.NewSessionFromOAuthExchange("http://dashboard/callback", "code", "verifier")
			require.NoError(t, err, "both token endpoint authentication and HMAC verification must still work")
			require.False(t, session.IsWriteable)
			require.True(t, s.IsSessionValid(session))
		})
	}
}

func TestClientSecretDoesNotFollowChangedTrust(t *testing.T) {
	for _, change := range []string{"provider", "client ID", "issuer"} {
		t.Run(change, func(t *testing.T) {
			s, store := newTestService(t)
			p := newTestProvider(t)
			req := p.request()
			req.Config.ClientSecret = testClientSecret
			_, err := s.saveConfig(req)
			require.NoError(t, err)
			oldSession, err := s.NewSessionFromOAuthExchange("http://dashboard/callback", "code", "verifier")
			require.NoError(t, err)
			req.Config.ClientSecret = ""
			switch change {
			case "provider":
				req.Config.DiscoveryURL = newTestProvider(t).server.URL
			case "client ID":
				req.Config.ClientID = "another-client"
			case "issuer":
				require.NoError(t, store.Modify(func(dc *config.DynamicConfig) { dc.SSO.Issuer = "https://old-issuer.example" }))
			}
			before, err := store.Get()
			require.NoError(t, err)
			_, err = s.saveConfig(req)
			require.Error(t, err, "must not transfer a stored secret to different trust settings")
			after, err := store.Get()
			require.NoError(t, err)
			require.Equal(t, before.SSO, after.SSO)
			require.True(t, s.IsSessionValid(oldSession), "a rejected save must not revoke existing access")
			req.Config.ClientSecret = "new-client-secret"
			_, err = s.saveConfig(req)
			require.NoError(t, err, "fresh SQL authorization may bind a new secret to the new trust settings")
			after, err = store.Get()
			require.NoError(t, err)
			require.Equal(t, "new-client-secret", after.SSO.CoreConfig.ClientSecret)
			// A caller with fresh SQL authorization may explicitly choose a public
			// client instead. No old secret may survive that successful change.
			req.ClearClientSecret = true
			req.Config.ClientSecret = ""
			_, err = s.saveConfig(req)
			require.NoError(t, err)
			after, err = store.Get()
			require.NoError(t, err)
			require.Empty(t, after.SSO.CoreConfig.ClientSecret)
		})
	}
}

func TestClientSecretSettingsAPIRedactionAndExplicitClear(t *testing.T) {
	gin.SetMode(gin.TestMode)
	s, store := newTestService(t)
	p := newTestProvider(t)
	engine := gin.New()
	engine.Use(rest.ErrorHandlerFn(), func(c *gin.Context) {
		c.Set(utils.SessionUserKey, &utils.SessionUser{
			HasTiDBAuth: true, IsWriteable: true, TiDBUsername: "root", AuthFrom: utils.AuthTypeSQL,
		})
	})
	engine.PUT("/config", requireSQLManagement(), s.setConfig)
	engine.GET("/config", s.getConfig)
	req := p.request()
	req.Config.ClientSecret = testClientSecret
	for _, action := range []string{"set", "preserve", "clear"} {
		if action != "set" {
			req.Config.ClientSecret = ""
			req.Config.IsReadOnly = true
		}
		req.ClearClientSecret = action == "clear"
		body, err := json.Marshal(req)
		require.NoError(t, err)
		request := httptest.NewRequest(http.MethodPut, "/config", strings.NewReader(string(body)))
		request.Header.Set("Content-Type", "application/json")
		resp := httptest.NewRecorder()
		engine.ServeHTTP(resp, request)
		require.Equal(t, http.StatusOK, resp.Code, resp.Body.String())
		require.NotContains(t, resp.Body.String(), testClientSecret)
		var result config.SSOCoreConfig
		require.NoError(t, json.Unmarshal(resp.Body.Bytes(), &result))
		require.Empty(t, result.ClientSecret)
		dc, err := store.Get()
		require.NoError(t, err)
		if action == "clear" {
			require.Empty(t, dc.SSO.CoreConfig.ClientSecret)
		} else {
			require.Equal(t, testClientSecret, dc.SSO.CoreConfig.ClientSecret)
		}
		resp = httptest.NewRecorder()
		engine.ServeHTTP(resp, httptest.NewRequest(http.MethodGet, "/config", nil))
		require.Equal(t, http.StatusOK, resp.Code)
		require.NoError(t, json.Unmarshal(resp.Body.Bytes(), &result))
		require.Empty(t, result.ClientSecret)
		require.NotContains(t, resp.Body.String(), testClientSecret)
	}
}

func TestClientSecretReplacementAndClearing(t *testing.T) {
	s, store := newTestService(t)
	p := newTestProvider(t)
	req := p.request()
	req.Config.ClientSecret = testClientSecret
	_, err := s.saveConfig(req)
	require.NoError(t, err)
	req.Config.ClientSecret = "replacement-client-secret"
	_, err = s.saveConfig(req)
	require.NoError(t, err)
	dc, err := store.Get()
	require.NoError(t, err)
	require.Equal(t, "replacement-client-secret", dc.SSO.CoreConfig.ClientSecret)
	req.ClearClientSecret = true
	_, err = s.saveConfig(req)
	require.Error(t, err, "ambiguous replacement and clearing must be rejected")
	req.Config.ClientSecret = ""
	req.Password = "wrong"
	_, err = s.saveConfig(req)
	require.Error(t, err)
	dc, err = store.Get()
	require.NoError(t, err)
	require.Equal(t, "replacement-client-secret", dc.SSO.CoreConfig.ClientSecret)
	req.Password = "root-password"
	_, err = s.saveConfig(req)
	require.NoError(t, err)
	dc, err = store.Get()
	require.NoError(t, err)
	require.Empty(t, dc.SSO.CoreConfig.ClientSecret)
}
