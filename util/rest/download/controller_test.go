// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package download

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt"
	"github.com/stretchr/testify/require"
)

type testFooClaim struct {
	Foo string
	jwt.StandardClaims
}

type testBarClaim struct {
	Bar string
	jwt.StandardClaims
}

func TestGetTokenAndDownload(t *testing.T) {
	ctl := NewController()
	token, err := ctl.GetDownloadToken(testFooClaim{
		Foo: "abc",
	})
	require.NoError(t, err)
	require.NotEmpty(t, token)

	var outputClaim testFooClaim
	err = ctl.HandleDownloadToken(token, &outputClaim)
	require.NoError(t, err)
	require.Equal(t, "abc", outputClaim.Foo)

	// When no expiration time is set, the token should be valid forever.
	time.Sleep(time.Millisecond * 1100)

	err = ctl.HandleDownloadToken(token, &outputClaim)
	require.NoError(t, err)
	require.Equal(t, "abc", outputClaim.Foo)
}

func TestMultipleToken(t *testing.T) {
	ctl := NewController()
	token1, err := ctl.GetDownloadToken(testFooClaim{
		Foo: "t1",
	})
	require.NoError(t, err)
	require.NotEmpty(t, token1)

	token2, err := ctl.GetDownloadToken(testFooClaim{
		Foo: "t2",
	})
	require.NoError(t, err)
	require.NotEmpty(t, token2)

	var outputClaim testFooClaim
	err = ctl.HandleDownloadToken(token1, &outputClaim)
	require.NoError(t, err)
	require.Equal(t, "t1", outputClaim.Foo)

	err = ctl.HandleDownloadToken(token2, &outputClaim)
	require.NoError(t, err)
	require.Equal(t, "t2", outputClaim.Foo)
}

func TestInvalidToken(t *testing.T) {
	var outputClaim testFooClaim
	ctl := NewController()
	err := ctl.HandleDownloadToken("some_definitely_invalid_token", &outputClaim)
	require.NotNil(t, err)
	require.Contains(t, err.Error(), "download token is invalid")
	require.Empty(t, outputClaim.Foo)
}

func TestTokenFromAnotherServer(t *testing.T) {
	ctl1 := NewController()
	token, err := ctl1.GetDownloadToken(testFooClaim{
		Foo: "def",
	})
	require.NoError(t, err)
	require.NotEmpty(t, token)

	ctl2 := NewController()

	var outputClaim testFooClaim
	err = ctl1.HandleDownloadToken(token, &outputClaim)
	require.NoError(t, err)
	require.Equal(t, "def", outputClaim.Foo)

	err = ctl2.HandleDownloadToken(token, &outputClaim)
	require.NotNil(t, err)
	require.Contains(t, err.Error(), "download token is invalid")
	require.Equal(t, "def", outputClaim.Foo) // unchanged

	token2, err := ctl2.GetDownloadToken(testFooClaim{Foo: ""})
	require.NoError(t, err)
	err = ctl2.HandleDownloadToken(token2, &outputClaim)
	require.NoError(t, err)
	require.Equal(t, "", outputClaim.Foo)
}

func TestExpiredToken(t *testing.T) {
	ctl := NewController()
	token, err := ctl.GetDownloadToken(testFooClaim{
		Foo: "bar",
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: time.Now().Unix(),
		},
	})
	require.NoError(t, err)
	require.NotEmpty(t, token)

	var outputClaim testFooClaim
	err = ctl.HandleDownloadToken(token, &outputClaim)
	require.NoError(t, err)
	require.Equal(t, "bar", outputClaim.Foo)

	time.Sleep(time.Millisecond * 1100)

	err = ctl.HandleDownloadToken(token, &outputClaim)
	require.NotNil(t, err)
	require.Contains(t, err.Error(), "download token is expired")
}

// TestAudience shows that audience in the token must be checked explicitly.
func TestAudience(t *testing.T) {
	ctl := NewController()
	token, err := ctl.GetDownloadToken(testFooClaim{
		Foo: "xy",
		StandardClaims: jwt.StandardClaims{
			Audience: "aud1",
		},
	})
	require.NoError(t, err)
	require.NotEmpty(t, token)

	var outputClaim testFooClaim
	err = ctl.HandleDownloadToken(token, &outputClaim)
	require.NoError(t, err)
	require.Equal(t, "xy", outputClaim.Foo)

	r := outputClaim.VerifyAudience("aud1", true)
	require.True(t, r)

	r = outputClaim.VerifyAudience("aud2", true)
	require.False(t, r)
}

func TestDifferentClaimType(t *testing.T) {
	ctl := NewController()
	token, err := ctl.GetDownloadToken(testFooClaim{
		Foo: "x",
	})
	require.NoError(t, err)
	require.NotEmpty(t, token)

	var outputClaim testBarClaim
	err = ctl.HandleDownloadToken(token, &outputClaim)
	require.NoError(t, err)
	require.Equal(t, "", outputClaim.Bar)
}
