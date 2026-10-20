// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package sso

import (
	"crypto/x509"
	"encoding/base64"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v4"
	"github.com/stretchr/testify/require"
)

const testClientSecret = "a-long-private-oidc-client-secret-that-has-at-least-sixty-four-bytes"

func signHMACToken(t *testing.T, p *testProvider, method *jwt.SigningMethodHMAC, key []byte, overrides jwt.MapClaims) string {
	t.Helper()
	h := method.Hash.New()
	_, _ = h.Write([]byte("access-token"))
	claims := jwt.MapClaims{
		"iss": p.server.URL, "aud": "dashboard", "sub": "alice",
		"iat": time.Now().Unix(), "exp": time.Now().Add(time.Hour).Unix(),
		"at_hash": base64.RawURLEncoding.EncodeToString(h.Sum(nil)[:h.Size()/2]),
	}
	for name, value := range overrides {
		claims[name] = value
	}
	token, err := jwt.NewWithClaims(method, claims).SignedString(key)
	require.NoError(t, err)
	return token
}

func TestHMACOIDCLogin(t *testing.T) {
	for _, method := range []*jwt.SigningMethodHMAC{jwt.SigningMethodHS256, jwt.SigningMethodHS384, jwt.SigningMethodHS512} {
		t.Run(method.Alg(), func(t *testing.T) {
			s, _ := newTestService(t)
			p := newTestProvider(t)
			p.mu.Lock()
			p.signingAlgs = []string{"RS256", method.Alg()}
			p.token = signHMACToken(t, p, method, []byte(testClientSecret), nil)
			p.mu.Unlock()
			req := p.request()
			req.Config.ClientSecret = testClientSecret
			_, err := s.saveConfig(req)
			require.NoError(t, err)
			session, err := s.NewSessionFromOAuthExchange("http://dashboard/callback", "code", "verifier")
			require.NoError(t, err)
			require.Equal(t, "root", session.TiDBUsername)
			require.True(t, s.IsSessionValid(session))
		})
	}
}

func TestHMACOIDCRejectsInvalidIdentityAndKeys(t *testing.T) {
	s, _ := newTestService(t)
	p := newTestProvider(t)
	p.mu.Lock()
	p.signingAlgs = []string{"RS256", "HS256"}
	p.mu.Unlock()
	req := p.request()
	req.Config.ClientSecret = testClientSecret
	_, err := s.saveConfig(req)
	require.NoError(t, err)
	publicKey, err := x509.MarshalPKIXPublicKey(&p.key.PublicKey)
	require.NoError(t, err)
	for _, tc := range []struct {
		name   string
		claims jwt.MapClaims
		key    []byte
	}{
		{name: "wrong issuer", claims: jwt.MapClaims{"iss": "https://attacker.example"}},
		{name: "wrong audience", claims: jwt.MapClaims{"aud": "another-client"}},
		{name: "multiple audiences", claims: jwt.MapClaims{"aud": []string{"dashboard", "another-client"}}},
		{name: "expired", claims: jwt.MapClaims{"exp": time.Now().Add(-time.Hour).Unix()}},
		{name: "missing subject", claims: jwt.MapClaims{"sub": ""}},
		{name: "wrong access token hash", claims: jwt.MapClaims{"at_hash": "invalid"}},
		{name: "wrong secret", key: []byte("another-long-secret-that-is-not-the-configured-client-secret")},
		{name: "public key is not HMAC secret", key: publicKey},
	} {
		t.Run(tc.name, func(t *testing.T) {
			key := tc.key
			if key == nil {
				key = []byte(testClientSecret)
			}
			p.mu.Lock()
			p.token = signHMACToken(t, p, jwt.SigningMethodHS256, key, tc.claims)
			p.mu.Unlock()
			_, err := s.NewSessionFromOAuthExchange("http://dashboard/callback", "code", "verifier")
			require.Error(t, err)
		})
	}

	t.Run("provider did not advertise HMAC", func(t *testing.T) {
		p.mu.Lock()
		p.signingAlgs = []string{"RS256"}
		p.token = signHMACToken(t, p, jwt.SigningMethodHS256, []byte(testClientSecret), nil)
		p.mu.Unlock()
		_, err := s.saveConfig(req)
		require.NoError(t, err)
		_, err = s.NewSessionFromOAuthExchange("http://dashboard/callback", "code", "verifier")
		require.Error(t, err)
	})
	t.Run("missing client secret", func(t *testing.T) {
		p.mu.Lock()
		p.signingAlgs = []string{"HS256"}
		p.mu.Unlock()
		req.Config.ClientSecret = ""
		_, err := s.saveConfig(req)
		require.NoError(t, err)
		_, err = s.NewSessionFromOAuthExchange("http://dashboard/callback", "code", "verifier")
		require.Error(t, err)
	})
	t.Run("unsigned token", func(t *testing.T) {
		p.mu.Lock()
		p.signingAlgs = []string{"none"}
		p.token, err = jwt.NewWithClaims(jwt.SigningMethodNone, jwt.MapClaims{
			"iss": p.server.URL, "aud": "dashboard", "sub": "alice", "exp": time.Now().Add(time.Hour).Unix(),
		}).SignedString(jwt.UnsafeAllowNoneSignatureType)
		p.mu.Unlock()
		require.NoError(t, err)
		_, err = s.saveConfig(req)
		require.NoError(t, err)
		_, err = s.NewSessionFromOAuthExchange("http://dashboard/callback", "code", "verifier")
		require.Error(t, err)
	})
}
