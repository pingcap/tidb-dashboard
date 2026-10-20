// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package keyvisual

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
	clientv3 "go.etcd.io/etcd/client/v3"
	"go.uber.org/fx"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	apiutils "github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/pkg/config"
	"github.com/pingcap/tidb-dashboard/pkg/utils"
	"github.com/pingcap/tidb-dashboard/util/featureflag"
	"github.com/pingcap/tidb-dashboard/util/rest"
)

type policyTestKV struct {
	clientv3.KV
	mu    sync.Mutex
	value string
}

func (kv *policyTestKV) Put(_ context.Context, _, value string, _ ...clientv3.OpOption) (*clientv3.PutResponse, error) {
	kv.mu.Lock()
	defer kv.mu.Unlock()
	kv.value = value
	return &clientv3.PutResponse{}, nil
}

func (kv *policyTestKV) Get(context.Context, string, ...clientv3.OpOption) (*clientv3.GetResponse, error) {
	return &clientv3.GetResponse{}, nil
}

type policyTestLifecycle struct{}

func (*policyTestLifecycle) Append(fx.Hook) {}

type policyTestAuthenticator struct{ user.BaseAuthenticator }

func (*policyTestAuthenticator) Authenticate(f user.AuthenticateForm) (*apiutils.SessionUser, error) {
	return &apiutils.SessionUser{
		Version: apiutils.SessionVersion, HasTiDBAuth: true, TiDBUsername: f.Username, IsWriteable: f.Username == "writer",
	}, nil
}

func TestKeyVisualConfigAPIRejectsInvalidPolicy(t *testing.T) {
	gin.SetMode(gin.TestMode)
	kv := &policyTestKV{}
	m := config.NewDynamicConfigManager(&policyTestLifecycle{}, config.Default(), &clientv3.Client{KV: kv})
	updates := m.NewPushChannel()
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(func() { cancel(); require.NoError(t, m.Stop(context.Background())) })
	require.NoError(t, m.Start(ctx))
	select {
	case <-updates:
	case <-time.After(5 * time.Second):
		t.Fatal("config manager did not start")
	}
	auth := user.NewAuthService(featureflag.NewRegistry("999.999.999"))
	auth.RegisterAuthenticator(apiutils.AuthTypeSQL, &policyTestAuthenticator{})
	engine := gin.New()
	engine.Use(rest.ErrorHandlerFn())
	engine.POST("/login", auth.LoginHandler)
	RegisterRouter(engine.Group(""), auth, &Service{cfgManager: m, status: utils.NewServiceStatus()})
	tokens := map[string]string{}
	for _, name := range []string{"reader", "writer"} {
		body, err := json.Marshal(user.AuthenticateForm{Type: apiutils.AuthTypeSQL, Username: name})
		require.NoError(t, err)
		req := httptest.NewRequest(http.MethodPost, "/login", strings.NewReader(string(body)))
		req.Header.Set("Content-Type", "application/json")
		resp := httptest.NewRecorder()
		engine.ServeHTTP(resp, req)
		require.Equal(t, http.StatusOK, resp.Code)
		var token user.TokenResponse
		require.NoError(t, json.Unmarshal(resp.Body.Bytes(), &token))
		tokens[name] = token.Token
	}
	for _, tc := range []struct {
		name, user, policy string
		disabled           bool
		status             int
	}{
		{"anonymous", "", "db", false, http.StatusUnauthorized},
		{"reader", "reader", "db", false, http.StatusForbidden},
		{"disabled invalid policy", "writer", "invalid-policy", true, http.StatusBadRequest},
		{"enabled invalid policy", "writer", "invalid-policy", false, http.StatusBadRequest},
		{"disable without policy", "writer", "", true, http.StatusOK},
		{"enabled missing policy", "writer", "", false, http.StatusBadRequest},
		{"valid disabled db", "writer", "db", true, http.StatusOK},
		{"valid enabled db", "writer", "db", false, http.StatusOK},
		{"valid disabled kv", "writer", "kv", true, http.StatusOK},
		{"valid enabled kv", "writer", "kv", false, http.StatusOK},
		{"disable kv without policy", "writer", "", true, http.StatusOK},
	} {
		t.Run(tc.name, func(t *testing.T) {
			before, err := m.Get()
			require.NoError(t, err)
			kv.mu.Lock()
			storedBefore := kv.value
			kv.mu.Unlock()
			settings := config.KeyVisualConfig{AutoCollectionDisabled: tc.disabled, Policy: tc.policy, PolicyKVSeparator: "/"}
			body, err := json.Marshal(settings)
			require.NoError(t, err)
			if tc.disabled && tc.policy == "" {
				body = []byte(`{"auto_collection_disabled":true}`)
			}
			req := httptest.NewRequest(http.MethodPut, "/keyvisual/config", strings.NewReader(string(body)))
			req.Header.Set("Content-Type", "application/json")
			if tc.user != "" {
				req.Header.Set("Authorization", "Bearer "+tokens[tc.user])
			}
			resp := httptest.NewRecorder()
			engine.ServeHTTP(resp, req)
			require.Equal(t, tc.status, resp.Code, resp.Body.String())
			after, err := m.Get()
			require.NoError(t, err)
			kv.mu.Lock()
			storedAfter := kv.value
			kv.mu.Unlock()
			if tc.status == http.StatusOK {
				if tc.disabled && tc.policy == "" {
					settings.Policy = before.KeyVisual.Policy
					settings.PolicyKVSeparator = before.KeyVisual.PolicyKVSeparator
				}
				require.Equal(t, settings, after.KeyVisual)
			} else {
				require.Equal(t, before, after)
				require.Equal(t, storedBefore, storedAfter)
			}
		})
	}
}

func TestInvalidPolicyDoesNotCrashProcess(t *testing.T) {
	if os.Getenv("DASHBOARD_TEST_INVALID_KEYVIZ") == "1" {
		s := &Service{status: utils.NewServiceStatus(), config: config.Default()}
		done := make(chan struct{})
		go func() {
			s.resetKeyVisualConfig(context.Background(), &config.DynamicConfig{
				KeyVisual: config.KeyVisualConfig{Policy: "invalid-policy"},
			})
			close(done)
		}()
		select {
		case <-done:
			require.False(t, s.IsRunning())
			require.Nil(t, s.app)
		case <-time.After(5 * time.Second):
			t.Fatal("invalid policy blocked service startup")
		}
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, os.Args[0], "-test.run=^TestInvalidPolicyDoesNotCrashProcess$")
	cmd.Env = append(os.Environ(), "DASHBOARD_TEST_INVALID_KEYVIZ=1")
	output, err := cmd.CombinedOutput()
	require.NoError(t, err, string(output))
	require.Contains(t, string(output), "unsupported key visualizer policy")
	require.NotContains(t, string(output), "panic:")
}
