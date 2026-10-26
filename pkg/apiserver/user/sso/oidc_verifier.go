// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package sso

import (
	"context"
	"crypto/sha256"
	"crypto/sha512"
	"crypto/subtle"
	"encoding/base64"
	"fmt"
	"hash"

	"github.com/coreos/go-oidc/v3/oidc"
	jose "github.com/go-jose/go-jose/v4"

	"github.com/pingcap/tidb-dashboard/pkg/config"
)

// hmacKeySet never uses remotely published public keys as HMAC secrets.
type hmacKeySet struct {
	secret    string
	algorithm jose.SignatureAlgorithm
}

func (k hmacKeySet) VerifySignature(_ context.Context, raw string) ([]byte, error) {
	if k.secret == "" {
		return nil, fmt.Errorf("OIDC client secret is required for HMAC signatures")
	}
	signed, err := jose.ParseSigned(raw, []jose.SignatureAlgorithm{k.algorithm})
	if err != nil {
		return nil, err
	}
	return signed.Verify([]byte(k.secret))
}

// verifyIDToken supports public-key and client-secret signatures while retaining
// the OIDC verifier's issuer, audience, expiry, and signature checks.
func verifyIDToken(ctx context.Context, cfg config.SSOConfig, raw, accessToken string) (*oidc.IDToken, error) {
	signed, err := jose.ParseSigned(raw, []jose.SignatureAlgorithm{
		jose.RS256, jose.RS384, jose.RS512, jose.PS256, jose.PS384, jose.PS512,
		jose.ES256, jose.ES384, jose.ES512, jose.EdDSA, jose.HS256, jose.HS384, jose.HS512,
	})
	if err != nil {
		return nil, err
	}
	if len(signed.Signatures) != 1 {
		return nil, fmt.Errorf("OIDC ID token must have one signature")
	}
	algorithm := jose.SignatureAlgorithm(signed.Signatures[0].Header.Algorithm)
	var keySet oidc.KeySet = oidc.NewRemoteKeySet(ctx, cfg.JWKSURL)
	var hmacHash hash.Hash
	switch algorithm {
	case jose.HS256:
		hmacHash = sha256.New()
	case jose.HS384:
		hmacHash = sha512.New384()
	case jose.HS512:
		hmacHash = sha512.New()
	}
	if hmacHash != nil {
		keySet = hmacKeySet{secret: cfg.CoreConfig.ClientSecret, algorithm: algorithm}
	}
	verifier := oidc.NewVerifier(cfg.Issuer, keySet, &oidc.Config{
		ClientID: cfg.CoreConfig.ClientID, SupportedSigningAlgs: cfg.SigningAlgs,
	})
	verified, err := verifier.Verify(ctx, raw)
	if err != nil {
		return nil, err
	}
	// OIDC leaves HMAC validation with multiple audiences unspecified. Only the
	// configured client's secret may establish trust, so require one audience.
	if hmacHash != nil && (len(verified.Audience) != 1 || verified.Audience[0] != cfg.CoreConfig.ClientID) {
		return nil, fmt.Errorf("HMAC ID token must have exactly the configured client as audience")
	}
	if verified.Subject == "" {
		return nil, fmt.Errorf("OIDC ID token is missing subject")
	}
	if verified.AccessTokenHash != "" {
		if hmacHash == nil {
			err = verified.VerifyAccessToken(accessToken)
		} else {
			// go-oidc's VerifyAccessToken supports asymmetric algorithms only.
			_, _ = hmacHash.Write([]byte(accessToken))
			sum := hmacHash.Sum(nil)[:hmacHash.Size()/2]
			expected := base64.RawURLEncoding.EncodeToString(sum)
			if subtle.ConstantTimeCompare([]byte(expected), []byte(verified.AccessTokenHash)) != 1 {
				err = fmt.Errorf("OIDC access token hash does not match")
			}
		}
		if err != nil {
			return nil, err
		}
	}
	return verified, nil
}
