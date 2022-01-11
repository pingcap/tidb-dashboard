// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package lister

import (
	"github.com/golang-jwt/jwt"
	"github.com/gtank/cryptopasta"
	"github.com/joomcode/errorx"

	"github.com/pingcap/tidb-dashboard/util/topo"
)

// HS256Signer is a signer that use HS256 jwt to sign and verify the component list.
type HS256Signer struct {
	secret []byte
}

var _ Signer = &HS256Signer{}

func NewHS256Signer() Signer {
	return &HS256Signer{
		secret: cryptopasta.NewHMACKey()[:],
	}
}

type SignedComponentDescriptor string // TODO (wenxuan): I'm not sure, but it may be a good idea to always keep it in the same format.

type cdClaim struct {
	jwt.StandardClaims
	topo.ComponentDescriptor
}

func (s *HS256Signer) Sign(d topo.ComponentDescriptor) (SignedComponentDescriptor, error) {
	claims := cdClaim{
		ComponentDescriptor: d,
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenSigned, err := token.SignedString(s.secret)
	if err != nil {
		return "", err
	}
	return SignedComponentDescriptor(tokenSigned), nil
}

func (s *HS256Signer) Verify(sd SignedComponentDescriptor) (topo.ComponentDescriptor, error) {
	token, err := jwt.ParseWithClaims(
		string(sd),
		&cdClaim{},
		func(token *jwt.Token) (interface{}, error) {
			return s.secret, nil
		})
	if token != nil {
		if claims, ok := token.Claims.(*cdClaim); ok && token.Valid {
			return claims.ComponentDescriptor, nil
		}
	}
	return topo.ComponentDescriptor{}, errorx.Decorate(err, "descriptor verify failed")
}

func (s *HS256Signer) BatchVerify(sdList []SignedComponentDescriptor) ([]topo.ComponentDescriptor, error) {
	result := make([]topo.ComponentDescriptor, 0, len(sdList))
	for _, sd := range sdList {
		d, err := s.Verify(sd)
		if err != nil {
			return nil, err
		}
		result = append(result, d)
	}
	return result, nil
}
