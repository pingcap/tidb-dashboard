// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package utils

import (
	"testing"
	"time"

	jwt "github.com/golang-jwt/jwt/v4"
	"github.com/stretchr/testify/require"
)

func TestParseJWTStringOnlyAcceptsHS256(t *testing.T) {
	for _, method := range []jwt.SigningMethod{
		jwt.SigningMethodHS256, jwt.SigningMethodHS384, jwt.SigningMethodHS512, jwt.SigningMethodNone,
	} {
		t.Run(method.Alg(), func(t *testing.T) {
			var key interface{} = hmacSampleSecret[:]
			if method == jwt.SigningMethodNone {
				key = jwt.UnsafeAllowNoneSignatureType
			}
			token, err := jwt.NewWithClaims(method, newClaims("download", "fixture", time.Hour)).SignedString(key)
			require.NoError(t, err)
			data, err := ParseJWTString("download", token)
			if method == jwt.SigningMethodHS256 {
				require.NoError(t, err)
				require.Equal(t, "fixture", data)
			} else {
				require.Error(t, err)
			}
		})
	}
}

func TestParseJWTStringPreservesExistingTokens(t *testing.T) {
	for _, issuer := range []string{
		"statements/download", "slowquery/download", "logs/download",
		"profiling/group_download", "profiling/single_download", "profiling/single_view",
		"diagnose/report", "diagnose/metrics", "conprof",
	} {
		t.Run(issuer, func(t *testing.T) {
			// Use the existing signing format, independently of the issuing helper.
			token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, newClaims(issuer, "fixture", time.Hour)).SignedString(hmacSampleSecret[:])
			require.NoError(t, err)
			data, err := ParseJWTString(issuer, token)
			require.NoError(t, err)
			require.Equal(t, "fixture", data)
			_, err = ParseJWTString("different-issuer", token)
			require.Error(t, err)
		})
	}
	for _, tc := range []struct {
		name string
		key  []byte
		ttl  time.Duration
	}{
		{name: "wrong signature", key: []byte("different-key"), ttl: time.Hour},
		{name: "expired", key: hmacSampleSecret[:], ttl: -time.Hour},
	} {
		t.Run(tc.name, func(t *testing.T) {
			token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, newClaims("download", "fixture", tc.ttl)).SignedString(tc.key)
			require.NoError(t, err)
			_, err = ParseJWTString("download", token)
			require.Error(t, err)
		})
	}
}
