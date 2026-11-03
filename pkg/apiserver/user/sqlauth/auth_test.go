// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package sqlauth

import (
	"bytes"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"errors"
	"math/big"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joomcode/errorx"
	"github.com/stretchr/testify/require"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/pkg/tidb"
	"github.com/pingcap/tidb-dashboard/util/featureflag"
	"github.com/pingcap/tidb-dashboard/util/rest"
)

func newTestAuthenticator(t *testing.T) (*Authenticator, *user.AuthService) {
	t.Helper()
	t.Setenv("DASHBOARD_SESSION_SECRET", "")
	service := user.NewAuthService(featureflag.NewRegistry("8.5.0"))
	a := NewAuthenticator(nil)
	registerAuthenticator(a, service)
	return a, service
}

func invalidPaddingCiphertext(key *rsa.PublicKey) string {
	// Correct ciphertext size and RSA range, but no PKCS#1 v1.5 separator.
	encoded := bytes.Repeat([]byte{0x42}, key.Size())
	encoded[0], encoded[1] = 0, 2
	ciphertext := new(big.Int).Exp(new(big.Int).SetBytes(encoded), big.NewInt(int64(key.E)), key.N)
	return base64.StdEncoding.EncodeToString(ciphertext.FillBytes(make([]byte, key.Size())))
}

func TestAuthenticatePreservesLegacyPasswords(t *testing.T) {
	a, service := newTestAuthenticator(t)
	for _, password := range []string{"", "normal-password", "密碼🔑", strings.Repeat("x", service.RsaPublicKey.Size()-11)} {
		t.Run(password[:min(len(password), 20)], func(t *testing.T) {
			a.verifySQLUser = func(name, received string) (bool, error) {
				require.Equal(t, "synthetic-user", name)
				require.Equal(t, password, received)
				return true, nil
			}
			ciphertext, err := user.Encrypt(password, service.RsaPublicKey)
			require.NoError(t, err)
			u, err := a.Authenticate(user.AuthenticateForm{Username: "synthetic-user", Password: ciphertext})
			require.NoError(t, err)
			require.Equal(t, &utils.SessionUser{
				Version: utils.SessionVersion, HasTiDBAuth: true, TiDBUsername: "synthetic-user",
				TiDBPassword: password, DisplayName: "synthetic-user", IsShareable: true, IsWriteable: true,
			}, u)
		})
	}
}

func TestLoginFailureDoesNotExposePaddingValidity(t *testing.T) {
	a, service := newTestAuthenticator(t)
	var receivedUsers, receivedPasswords []string
	a.verifySQLUser = func(name, password string) (bool, error) {
		receivedUsers = append(receivedUsers, name)
		receivedPasswords = append(receivedPasswords, password)
		return false, tidb.ErrTiDBAuthFailed.New("synthetic driver detail that must not be returned")
	}
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(rest.ErrorHandlerFn())
	r.POST("/login", service.LoginHandler)
	valid, err := user.Encrypt("wrong-password", service.RsaPublicKey)
	require.NoError(t, err)
	var firstBody string
	for _, ciphertext := range []string{valid, invalidPaddingCiphertext(service.RsaPublicKey), "not-base64"} {
		body, err := json.Marshal(user.AuthenticateForm{Type: typeID, Username: "synthetic-user", Password: ciphertext})
		require.NoError(t, err)
		response := httptest.NewRecorder()
		r.ServeHTTP(response, httptest.NewRequest(http.MethodPost, "/login", bytes.NewReader(body)))
		require.Equal(t, http.StatusUnauthorized, response.Code)
		require.Len(t, receivedUsers, len(receivedPasswords))
		if firstBody == "" {
			firstBody = response.Body.String()
		} else {
			require.Equal(t, firstBody, response.Body.String())
		}
		require.NotContains(t, response.Body.String(), "crypto/rsa")
		require.NotContains(t, response.Body.String(), "driver detail")
		require.NotContains(t, response.Body.String(), `"token"`)
	}
	require.Equal(t, []string{"synthetic-user", "synthetic-user", "synthetic-user"}, receivedUsers)
	require.Equal(t, "wrong-password", receivedPasswords[0])
	for _, password := range receivedPasswords[1:] {
		require.NotEmpty(t, password)
		require.NotEqual(t, "wrong-password", password)
	}
}

func TestInvalidCiphertextCannotCreateSession(t *testing.T) {
	a, service := newTestAuthenticator(t)
	a.verifySQLUser = func(_, _ string) (bool, error) { return true, nil }
	u, err := a.Authenticate(user.AuthenticateForm{Password: invalidPaddingCiphertext(service.RsaPublicKey)})
	require.Nil(t, u)
	require.True(t, errorx.IsOfType(err, tidb.ErrTiDBAuthFailed))
}

func TestAuthenticatePreservesReadOnlySession(t *testing.T) {
	a, service := newTestAuthenticator(t)
	a.verifySQLUser = func(_, _ string) (bool, error) { return false, nil }
	ciphertext, err := user.Encrypt("valid-password", service.RsaPublicKey)
	require.NoError(t, err)
	u, err := a.Authenticate(user.AuthenticateForm{Username: "reader", Password: ciphertext})
	require.NoError(t, err)
	require.True(t, u.HasTiDBAuth)
	require.False(t, u.IsWriteable)
	require.Equal(t, "reader", u.TiDBUsername)
	require.Equal(t, "valid-password", u.TiDBPassword)
}

func TestBothPaddingCasesWaitForSQLVerification(t *testing.T) {
	a, service := newTestAuthenticator(t)
	valid, err := user.Encrypt("wrong-password", service.RsaPublicKey)
	require.NoError(t, err)
	for _, ciphertext := range []string{valid, invalidPaddingCiphertext(service.RsaPublicKey)} {
		entered, release := make(chan struct{}), make(chan struct{})
		unblock := sync.OnceFunc(func() { close(release) })
		t.Cleanup(unblock)
		a.verifySQLUser = func(_, _ string) (bool, error) {
			close(entered)
			<-release
			return false, tidb.ErrTiDBAuthFailed.NewWithNoMessage()
		}
		result := make(chan error, 1)
		go func() {
			_, err := a.Authenticate(user.AuthenticateForm{Password: ciphertext})
			result <- err
		}()
		select {
		case <-entered:
		case <-time.After(5 * time.Second):
			t.Fatal("authentication did not enter SQL verification")
		}
		select {
		case err := <-result:
			t.Fatalf("authentication returned before SQL verification finished: %v", err)
		default:
		}
		unblock()
		require.Error(t, <-result)
	}
}

func TestAuthenticatePreservesActionableErrors(t *testing.T) {
	a, service := newTestAuthenticator(t)
	ciphertext, err := user.Encrypt("valid-password", service.RsaPublicKey)
	require.NoError(t, err)
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(rest.ErrorHandlerFn())
	r.POST("/login", service.LoginHandler)
	for _, backendErr := range []error{user.ErrInsufficientPrivs.NewWithNoMessage(), tidb.ErrNoAliveTiDB.NewWithNoMessage()} {
		a.verifySQLUser = func(_, _ string) (bool, error) { return false, backendErr }
		var firstBody string
		var firstStatus int
		for _, encrypted := range []string{ciphertext, invalidPaddingCiphertext(service.RsaPublicKey), "not-base64"} {
			_, err := a.Authenticate(user.AuthenticateForm{Password: encrypted})
			require.Same(t, backendErr, err)
			body, err := json.Marshal(user.AuthenticateForm{Type: typeID, Password: encrypted})
			require.NoError(t, err)
			response := httptest.NewRecorder()
			r.ServeHTTP(response, httptest.NewRequest(http.MethodPost, "/login", bytes.NewReader(body)))
			if firstBody == "" {
				firstBody, firstStatus = response.Body.String(), response.Code
			} else {
				require.Equal(t, firstStatus, response.Code)
				require.Equal(t, firstBody, response.Body.String())
			}
		}
	}
	a.verifySQLUser = func(_, _ string) (bool, error) { return false, errors.New("internal detail") }
	_, err = a.Authenticate(user.AuthenticateForm{Password: ciphertext})
	require.True(t, errorx.IsOfType(err, user.ErrSignInOther))
	require.NotContains(t, err.Error(), "internal detail")
}
