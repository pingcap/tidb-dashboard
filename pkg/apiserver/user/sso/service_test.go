// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package sso

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	jose "github.com/go-jose/go-jose/v4"
	"github.com/golang-jwt/jwt/v4"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user/code"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/pkg/config"
	"github.com/pingcap/tidb-dashboard/pkg/dbstore"
	"github.com/pingcap/tidb-dashboard/util/featureflag"
	"github.com/pingcap/tidb-dashboard/util/rest"
)

type testConfigStore struct {
	mu   sync.Mutex
	dc   config.DynamicConfig
	fail bool
}

func (m *testConfigStore) Get() (*config.DynamicConfig, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.dc.Clone(), nil
}

func (m *testConfigStore) Modify(opts ...config.DynamicConfigOption) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.fail {
		return errors.New("config persistence failed")
	}
	for _, opt := range opts {
		opt(&m.dc)
	}
	return nil
}

func newTestService(t *testing.T) (*Service, *testConfigStore) {
	t.Helper()
	dir := t.TempDir()
	db, err := gorm.Open(sqlite.Open(filepath.Join(dir, "dashboard.sqlite")), &gorm.Config{})
	require.NoError(t, err)
	sqlDB, err := db.DB()
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, sqlDB.Close()) })
	store := &testConfigStore{}
	s := &Service{
		params:        ServiceParams{LocalStore: &dbstore.DB{DB: db}},
		configManager: store, lifecycleCtx: context.Background(), encKeyPath: filepath.Join(dir, "dbek.bin"),
		verifySQLUser: func(name, password string) (bool, error) {
			if name == "root" && password == "root-password" {
				return true, nil
			}
			if name == "operator" && password == "operator-password" {
				return true, nil
			}
			return false, errors.New("invalid SQL credentials")
		},
	}
	require.NoError(t, autoMigrate(s.params.LocalStore))
	return s, store
}

type testProvider struct {
	mu             sync.Mutex
	server         *httptest.Server
	key            *rsa.PrivateKey
	signingAlgs    []string
	token          string
	subject        string
	userInfoStatus int
	onToken        func()
}

func newTestProvider(t *testing.T) *testProvider {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	require.NoError(t, err)
	p := &testProvider{key: key, signingAlgs: []string{"RS256"}, subject: "alice", userInfoStatus: http.StatusOK}
	p.server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p.mu.Lock()
		token, subject, status, onToken := p.token, p.subject, p.userInfoStatus, p.onToken
		algorithms := append([]string(nil), p.signingAlgs...)
		p.mu.Unlock()
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/.well-known/openid-configuration":
			_ = json.NewEncoder(w).Encode(oidcWellKnownConfig{
				Issuer: p.server.URL, AuthURL: p.server.URL + "/auth", TokenURL: p.server.URL + "/token",
				UserInfoURL: p.server.URL + "/userinfo", JWKSURI: p.server.URL + "/keys",
				ResponseTypesSupported: []string{"code"}, SubjectTypesSupported: []string{"public"},
				IDTokenSigningAlgValuesSupported: algorithms,
			})
		case "/token":
			if onToken != nil {
				onToken()
			}
			_ = json.NewEncoder(w).Encode(map[string]interface{}{
				"access_token": "access-token", "token_type": "Bearer", "id_token": token,
			})
		case "/keys":
			_ = json.NewEncoder(w).Encode(jose.JSONWebKeySet{Keys: []jose.JSONWebKey{{
				Key: &p.key.PublicKey, KeyID: "test", Algorithm: "RS256", Use: "sig",
			}}})
		case "/userinfo":
			w.WriteHeader(status)
			_ = json.NewEncoder(w).Encode(oAuthUserInfo{Subject: subject, Email: "alice@example.com"})
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	t.Cleanup(p.server.Close)
	p.mu.Lock()
	p.token = p.sign(t, nil, p.key)
	p.mu.Unlock()
	return p
}

func (p *testProvider) sign(t *testing.T, overrides jwt.MapClaims, key *rsa.PrivateKey) string {
	t.Helper()
	claims := jwt.MapClaims{"iss": p.server.URL, "aud": "dashboard", "sub": "alice", "exp": time.Now().Add(time.Hour).Unix(), "iat": time.Now().Unix()}
	for k, v := range overrides {
		claims[k] = v
	}
	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	token.Header["kid"] = "test"
	signed, err := token.SignedString(key)
	require.NoError(t, err)
	return signed
}

func (p *testProvider) request() SetConfigRequest {
	return SetConfigRequest{
		Config:  config.SSOCoreConfig{Enabled: true, ClientID: "dashboard", DiscoveryURL: p.server.URL},
		SQLUser: "root", Password: "root-password",
	}
}

func TestConfigRewriteRequiresFreshCredentialsAndRevokesSessions(t *testing.T) {
	s, store := newTestService(t)
	idp := newTestProvider(t)
	req := idp.request()
	_, err := s.saveConfig(req)
	require.NoError(t, err)
	before, err := store.Get()
	require.NoError(t, err)
	session, err := s.NewSessionFromOAuthExchange("http://dashboard/callback", "code", "verifier")
	require.NoError(t, err)
	require.Equal(t, "root", session.TiDBUsername)
	require.True(t, s.IsSessionValid(session))
	sharing := code.NewService()
	sharingCode := sharing.SharingCodeFromSession(session, time.Hour, false)
	require.NotNil(t, sharingCode)
	shared := sharing.NewSessionFromSharingCode(*sharingCode)
	require.NotNil(t, shared)
	require.Equal(t, session.SSOConfigRevision, shared.SSOConfigRevision)

	// A writeable SQL user cannot carry the old root delegation to another IdP,
	// either by omitting credentials, substituting its own account, or guessing root's password.
	attacker := newTestProvider(t)
	for _, credentials := range []struct{ name, password string }{{"", ""}, {"operator", "operator-password"}, {"root", "wrong"}} {
		attempt := attacker.request()
		attempt.SQLUser, attempt.Password = credentials.name, credentials.password
		_, err := s.saveConfig(attempt)
		require.Error(t, err)
		dc, err := store.Get()
		require.NoError(t, err)
		require.Equal(t, before.SSO, dc.SSO)
		require.True(t, s.IsSessionValid(session))
	}

	_, err = s.saveConfig(attacker.request())
	require.NoError(t, err)
	after, err := store.Get()
	require.NoError(t, err)
	require.NotEqual(t, before.SSO.Revision, after.SSO.Revision)
	require.False(t, s.IsSessionValid(session))
	require.False(t, s.IsSessionValid(shared))
	// Unredeemed codes retain the old revision and cannot bypass revocation either.
	require.False(t, s.IsSessionValid(sharing.NewSessionFromSharingCode(*sharingCode)))
	name, password, err := s.getAndDecryptImpersonation(after.SSO.Revision)
	require.NoError(t, err)
	require.Equal(t, "root", name)
	require.Equal(t, "root-password", password)
	_, _, err = s.getAndDecryptImpersonation(before.SSO.Revision)
	require.Error(t, err)
}

func TestConfigFailureAndLegacyDelegationFailClosed(t *testing.T) {
	s, store := newTestService(t)
	idp := newTestProvider(t)
	_, err := s.saveConfig(idp.request())
	require.NoError(t, err)
	session, err := s.NewSessionFromOAuthExchange("http://dashboard/callback", "code", "verifier")
	require.NoError(t, err)
	// Simulate a pre-fix row, including its SQL credential, without a trust binding.
	require.NoError(t, s.params.LocalStore.Model(&SSOImpersonationModel{}).Where("sql_user = ?", "root").Update("config_revision", "").Error)
	require.False(t, s.IsSessionValid(session))
	_, err = s.newSessionFromImpersonation(&oAuthUserInfo{}, "id-token")
	require.Error(t, err)

	_, err = s.saveConfig(idp.request())
	require.NoError(t, err)
	session, err = s.NewSessionFromOAuthExchange("http://dashboard/callback", "code", "verifier")
	require.NoError(t, err)
	store.fail = true
	_, err = s.saveConfig(idp.request())
	require.Error(t, err)
	_, err = s.newSessionFromImpersonation(&oAuthUserInfo{}, "id-token")
	require.Error(t, err, "a failed etcd write must not permit mixed credentials/config")
	require.False(t, s.IsSessionValid(session), "partial writes must not resurrect old sessions")
	store.fail = false
	_, err = s.saveConfig(idp.request())
	require.NoError(t, err, "SQL administrator can recover after persistence failure")
}

func TestDisableSSORequiresReauthorization(t *testing.T) {
	s, _ := newTestService(t)
	idp := newTestProvider(t)
	_, err := s.saveConfig(idp.request())
	require.NoError(t, err)
	session, err := s.NewSessionFromOAuthExchange("http://dashboard/callback", "code", "verifier")
	require.NoError(t, err)
	req := idp.request()
	req.Config.Enabled = false
	req.Password = "wrong"
	_, err = s.saveConfig(req)
	require.Error(t, err)
	require.True(t, s.IsSessionValid(session))
	req.Password = "root-password"
	_, err = s.saveConfig(req)
	require.NoError(t, err)
	require.False(t, s.IsSessionValid(session))
	var count int64
	require.NoError(t, s.params.LocalStore.Model(&SSOImpersonationModel{}).Count(&count).Error)
	require.Zero(t, count)
	_, err = s.createImpersonation("root", "root-password")
	require.Error(t, err, "the legacy endpoint cannot preauthorize a future arbitrary config")
}

type testManagementAuthenticator struct {
	user.BaseAuthenticator
	sqlUser string
}

func (a *testManagementAuthenticator) Authenticate(user.AuthenticateForm) (*utils.SessionUser, error) {
	name := a.sqlUser
	if name == "" {
		name = "root"
	}
	return &utils.SessionUser{Version: utils.SessionVersion, HasTiDBAuth: true, IsWriteable: true, TiDBUsername: name}, nil
}

func TestRegisteredManagementRoutesRejectSSOAndSharedJWTs(t *testing.T) {
	gin.SetMode(gin.TestMode)
	s, _ := newTestService(t)
	auth := user.NewAuthService(featureflag.NewRegistry("999.999.999"))
	engine := gin.New()
	engine.Use(rest.ErrorHandlerFn())
	engine.POST("/login", auth.LoginHandler)
	registerRouter(engine.Group(""), auth, s)
	for _, authType := range []utils.AuthType{utils.AuthTypeSSO, utils.AuthTypeCode} {
		auth.RegisterAuthenticator(authType, &testManagementAuthenticator{})
		body, err := json.Marshal(user.AuthenticateForm{Type: authType})
		require.NoError(t, err)
		req := httptest.NewRequest(http.MethodPost, "/login", strings.NewReader(string(body)))
		req.Header.Set("Content-Type", "application/json")
		resp := httptest.NewRecorder()
		engine.ServeHTTP(resp, req)
		require.Equal(t, http.StatusOK, resp.Code)
		var token user.TokenResponse
		require.NoError(t, json.Unmarshal(resp.Body.Bytes(), &token))
		for _, endpoint := range []struct{ method, path string }{
			{http.MethodPut, "/user/sso/config"}, {http.MethodPost, "/user/sso/impersonation"},
		} {
			req := httptest.NewRequest(endpoint.method, endpoint.path, strings.NewReader("{}"))
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("Authorization", "Bearer "+token.Token)
			resp := httptest.NewRecorder()
			engine.ServeHTTP(resp, req)
			require.Equal(t, http.StatusForbidden, resp.Code, "auth type %d reached %s", authType, endpoint.path)
		}
	}
}

func TestOIDCRejectsInvalidIdentity(t *testing.T) {
	s, _ := newTestService(t)
	idp := newTestProvider(t)
	_, err := s.saveConfig(idp.request())
	require.NoError(t, err)
	wrongKey, err := rsa.GenerateKey(rand.Reader, 2048)
	require.NoError(t, err)
	for _, tc := range []struct {
		name    string
		claims  jwt.MapClaims
		key     *rsa.PrivateKey
		subject string
		status  int
	}{
		{name: "wrong issuer", claims: jwt.MapClaims{"iss": "https://attacker.example"}},
		{name: "wrong audience", claims: jwt.MapClaims{"aud": "another-client"}},
		{name: "expired", claims: jwt.MapClaims{"exp": time.Now().Add(-time.Hour).Unix()}},
		{name: "missing subject", claims: jwt.MapClaims{"sub": ""}},
		{name: "wrong signature", key: wrongKey},
		{name: "wrong access token hash", claims: jwt.MapClaims{"at_hash": "invalid"}},
		{name: "different userinfo subject", subject: "mallory"},
		{name: "userinfo error", status: http.StatusUnauthorized},
	} {
		t.Run(tc.name, func(t *testing.T) {
			key := tc.key
			if key == nil {
				key = idp.key
			}
			idp.mu.Lock()
			idp.token = idp.sign(t, tc.claims, key)
			idp.subject = "alice"
			if tc.subject != "" {
				idp.subject = tc.subject
			}
			idp.userInfoStatus = http.StatusOK
			if tc.status != 0 {
				idp.userInfoStatus = tc.status
			}
			idp.mu.Unlock()
			_, err := s.NewSessionFromOAuthExchange("http://dashboard/callback", "code", "verifier")
			require.Error(t, err)
		})
	}
}

func TestSessionValidationDoesNotWaitForConfigSave(t *testing.T) {
	s, _ := newTestService(t)
	idp := newTestProvider(t)
	_, err := s.saveConfig(idp.request())
	require.NoError(t, err)
	session, err := s.NewSessionFromOAuthExchange("http://dashboard/callback", "code", "verifier")
	require.NoError(t, err)

	verifying, resume := make(chan struct{}), make(chan struct{})
	var resumeOnce sync.Once
	release := func() { resumeOnce.Do(func() { close(resume) }) }
	defer release()
	verifySQLUser := s.verifySQLUser
	s.verifySQLUser = func(name, password string) (bool, error) {
		close(verifying)
		<-resume
		return verifySQLUser(name, password)
	}
	writeDone := make(chan error, 1)
	go func() {
		_, err := s.saveConfig(idp.request())
		writeDone <- err
	}()
	select {
	case <-verifying:
	case <-time.After(5 * time.Second):
		t.Fatal("configuration save did not reach SQL verification")
	}

	validated := make(chan bool, 1)
	go func() { validated <- s.IsSessionValid(session) }()
	select {
	case valid := <-validated:
		require.True(t, valid, "the existing delegation remains valid before the save is published")
	case <-time.After(time.Second):
		t.Error("session validation waited for a configuration save's network call")
		release()
		<-validated
	}
	release()
	require.NoError(t, <-writeDone)
	require.False(t, s.IsSessionValid(session), "the completed save must still revoke the old session")
}

func TestConfigCannotChangeDuringOAuthExchange(t *testing.T) {
	s, _ := newTestService(t)
	idp := newTestProvider(t)
	_, err := s.saveConfig(idp.request())
	require.NoError(t, err)
	entered, resume := make(chan struct{}), make(chan struct{})
	var resumeOnce sync.Once
	release := func() { resumeOnce.Do(func() { close(resume) }) }
	defer release()
	idp.mu.Lock()
	idp.onToken = func() { close(entered); <-resume }
	idp.mu.Unlock()
	type result struct {
		session *utils.SessionUser
		err     error
	}
	loginDone := make(chan result, 1)
	go func() {
		u, err := s.NewSessionFromOAuthExchange("http://dashboard/callback", "code", "verifier")
		loginDone <- result{u, err}
	}()
	select {
	case <-entered:
	case <-time.After(5 * time.Second):
		t.Fatal("OAuth exchange did not reach token endpoint")
	}
	writeDone := make(chan error, 1)
	go func() {
		req := idp.request()
		req.Config.IsReadOnly = true
		_, err := s.saveConfig(req)
		writeDone <- err
	}()
	select {
	case err := <-writeDone:
		t.Fatalf("config update overtook in-flight OAuth exchange: %v", err)
	case <-time.After(50 * time.Millisecond):
	}
	release()
	login := <-loginDone
	require.NoError(t, login.err)
	require.True(t, login.session.IsWriteable)
	require.NoError(t, <-writeDone)
	require.False(t, s.IsSessionValid(login.session), "completed config change revokes the in-flight login's old revision")
}

func TestSSOManagementRequiresDirectSQLSession(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, tc := range []struct {
		name    string
		session *utils.SessionUser
		status  int
	}{
		{"SQL writer", &utils.SessionUser{HasTiDBAuth: true, IsWriteable: true, AuthFrom: utils.AuthTypeSQL}, http.StatusNoContent},
		{"SQL reader", &utils.SessionUser{HasTiDBAuth: true, AuthFrom: utils.AuthTypeSQL}, http.StatusForbidden},
		{"SSO writer", &utils.SessionUser{HasTiDBAuth: true, IsWriteable: true, AuthFrom: utils.AuthTypeSSO}, http.StatusForbidden},
		{"shared writer", &utils.SessionUser{HasTiDBAuth: true, IsWriteable: true, AuthFrom: utils.AuthTypeCode}, http.StatusForbidden},
		{"missing session", nil, http.StatusForbidden},
	} {
		t.Run(tc.name, func(t *testing.T) {
			engine := gin.New()
			engine.Use(rest.ErrorHandlerFn())
			engine.PUT("/", func(c *gin.Context) {
				if tc.session != nil {
					c.Set(utils.SessionUserKey, tc.session)
				}
			}, requireSQLManagement(), func(c *gin.Context) { c.Status(http.StatusNoContent) })
			resp := httptest.NewRecorder()
			engine.ServeHTTP(resp, httptest.NewRequest(http.MethodPut, "/", nil))
			require.Equal(t, tc.status, resp.Code)
		})
	}
}
