// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package code

import (
	"encoding/hex"
	"encoding/json"
	"math"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gtank/cryptopasta"
	"github.com/stretchr/testify/require"
	"github.com/vmihailenco/msgpack/v5"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/util/rest"
)

func TestSharingCodeDoesNotDelegateOIDCIDToken(t *testing.T) {
	s := NewService()
	original := &utils.SessionUser{
		Version: utils.SessionVersion, DisplayName: "SSO user", HasTiDBAuth: true,
		TiDBUsername: "operator", TiDBPassword: "sql-password", IsShareable: true, IsWriteable: true,
		OIDCIDToken: "idp-token-for-original-session", SSOConfigRevision: "current-revision",
	}
	sharingCode := s.SharingCodeFromSession(original, time.Hour, true)
	require.NotNil(t, sharingCode)
	encrypted, err := hex.DecodeString(*sharingCode)
	require.NoError(t, err)
	plain, err := cryptopasta.Decrypt(encrypted, s.loadShareingSecret())
	require.NoError(t, err)
	var payload struct {
		Session         map[string]interface{}
		ExpireAt        time.Time
		RevokeWritePriv bool
	}
	require.NoError(t, msgpack.Unmarshal(plain, &payload))
	require.NotContains(t, payload.Session, "OIDCIDToken", "the ID token must not be serialized into the sharing code")

	for _, tc := range []struct {
		name string
		code string
	}{
		{"new code", *sharingCode},
		{"old code containing an ID token", func() string {
			// Reproduce the previous wire format without changing the session version or encryption key.
			payload.Session["OIDCIDToken"] = original.OIDCIDToken
			legacyPlain, marshalErr := msgpack.Marshal(payload)
			require.NoError(t, marshalErr)
			legacyEncrypted, encryptErr := cryptopasta.Encrypt(legacyPlain, s.loadShareingSecret())
			require.NoError(t, encryptErr)
			return hex.EncodeToString(legacyEncrypted)
		}()},
	} {
		t.Run(tc.name, func(t *testing.T) {
			shared := s.NewSessionFromSharingCode(tc.code)
			require.NotNil(t, shared)
			require.Empty(t, shared.OIDCIDToken)
			require.Equal(t, original.TiDBUsername, shared.TiDBUsername)
			require.Equal(t, original.TiDBPassword, shared.TiDBPassword)
			require.True(t, shared.HasTiDBAuth)
			require.Equal(t, original.SSOConfigRevision, shared.SSOConfigRevision)
			require.WithinDuration(t, payload.ExpireAt, shared.SharedSessionExpireAt, time.Millisecond)
			require.False(t, shared.IsShareable)
			require.False(t, shared.IsWriteable)
		})
	}

	// The original SSO session still needs its ID token for IdP logout, including after JWT serialization.
	originalJSON, err := json.Marshal(original)
	require.NoError(t, err)
	var restored utils.SessionUser
	require.NoError(t, json.Unmarshal(originalJSON, &restored))
	require.Equal(t, "idp-token-for-original-session", restored.OIDCIDToken)
	require.True(t, original.IsWriteable)
}

func TestSharingCodeExpiryLimit(t *testing.T) {
	s := NewService()
	session := &utils.SessionUser{Version: utils.SessionVersion, IsShareable: true}
	for _, tc := range []struct {
		name     string
		expiry   time.Duration
		accepted bool
	}{
		{"negative", -time.Second, false},
		{"at limit", MaxSessionShareExpiry, true},
		{"over limit", MaxSessionShareExpiry + time.Second, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			code := s.SharingCodeFromSession(session, tc.expiry, false)
			if tc.accepted {
				require.NotNil(t, code)
			} else {
				require.Nil(t, code)
			}
		})
	}
}

func TestShareHandlerExpiryLimit(t *testing.T) {
	gin.SetMode(gin.TestMode)
	s := NewService()
	r := gin.New()
	r.Use(rest.ErrorHandlerFn())
	r.POST("/share", func(c *gin.Context) {
		c.Set(utils.SessionUserKey, &utils.SessionUser{Version: utils.SessionVersion, IsShareable: true})
		s.ShareHandler(c)
	})

	maxSeconds := int64(MaxSessionShareExpiry / time.Second)
	for _, tc := range []struct {
		name    string
		seconds int64
		status  int
	}{
		{"negative", -1, http.StatusBadRequest},
		{"at limit", maxSeconds, http.StatusOK},
		{"over limit", maxSeconds + 1, http.StatusBadRequest},
		{"duration overflow", math.MaxInt64, http.StatusBadRequest},
	} {
		t.Run(tc.name, func(t *testing.T) {
			body, err := json.Marshal(ShareRequest{ExpireInSeconds: tc.seconds})
			require.NoError(t, err)
			req := httptest.NewRequest(http.MethodPost, "/share", strings.NewReader(string(body)))
			req.Header.Set("Content-Type", "application/json")
			resp := httptest.NewRecorder()
			r.ServeHTTP(resp, req)
			require.Equal(t, tc.status, resp.Code, resp.Body.String())
		})
	}
}

func TestRejectLegacySharingCodes(t *testing.T) {
	s := NewService()
	legacy := &utils.SessionUser{Version: utils.SessionVersion - 1, IsShareable: true, HasTiDBAuth: true}
	code := s.SharingCodeFromSession(legacy, time.Hour, false)
	require.NotNil(t, code)
	require.Nil(t, s.NewSessionFromSharingCode(*code))

	current := &utils.SessionUser{Version: utils.SessionVersion, IsShareable: true, SSOConfigRevision: "current-revision"}
	code = s.SharingCodeFromSession(current, time.Hour, false)
	require.NotNil(t, code)
	session := s.NewSessionFromSharingCode(*code)
	require.NotNil(t, session)
	require.Equal(t, current.SSOConfigRevision, session.SSOConfigRevision)
	require.False(t, session.IsShareable)
}
