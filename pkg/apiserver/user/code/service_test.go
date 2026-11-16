// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package code

import (
	"encoding/json"
	"math"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/util/rest"
)

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
