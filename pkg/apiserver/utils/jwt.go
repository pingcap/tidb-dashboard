// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package utils

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt"
	"github.com/gtank/cryptopasta"
)

var hmacSampleSecret = cryptopasta.NewEncryptionKey()

// Claims is a struct that will be encoded to a JWT.
type Claims struct {
	Data string `json:"data"`
	jwt.StandardClaims
}

func newClaims(issuer string, data string, expireIn time.Duration) *Claims {
	return &Claims{
		Data: data,
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: time.Now().Add(expireIn).Unix(),
			Issuer:    issuer,
		},
	}
}

// NewJWTString create a JWT string by given data, expire in 24 hours.
func NewJWTString(issuer string, data string) (string, error) {
	return NewJWTStringWithExpire(issuer, data, 24*time.Hour)
}

func NewJWTStringWithExpire(issuer string, data string, expireIn time.Duration) (string, error) {
	claims := newClaims(issuer, data, expireIn)
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(hmacSampleSecret[:])
	if err != nil {
		return "", err
	}
	return tokenString, nil
}

// ParseJWTString parse the JWT string and return the raw data.
func ParseJWTString(requiredIssuer string, tokenStr string) (string, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(_ *jwt.Token) (interface{}, error) {
		return hmacSampleSecret[:], nil
	})
	if err != nil {
		return "", err
	}
	if !token.Valid {
		return "", fmt.Errorf("token is invalid or expired")
	}
	if claims.Issuer != requiredIssuer {
		return "", fmt.Errorf("token is invalid (invalid issuer)")
	}
	return claims.Data, nil
}
