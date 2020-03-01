// Copyright 2020 PingCAP, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// See the License for the specific language governing permissions and
// limitations under the License.

package user

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"time"

	jwt "github.com/appleboy/gin-jwt/v2"
	"github.com/gin-gonic/gin"
	"github.com/gtank/cryptopasta"
	"github.com/joomcode/errorx"
	"github.com/pingcap/log"
	"go.uber.org/zap"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/tidb"
)

var (
	ErrNS                        = errorx.NewNamespace("error.api.user")
	ErrNSSignIn                  = ErrNS.NewSubNamespace("signin")
	ErrSignInUnsupportedAuthType = ErrNSSignIn.NewType("unsupported_auth_type")
	ErrSignInOther               = ErrNSSignIn.NewType("other")
)

type AuthService struct {
	middleware *jwt.GinJWTMiddleware
}

type authenticateForm struct {
	IsTiDBAuth bool   `json:"is_tidb_auth" binding:"required"`
	Username   string `json:"username" binding:"required"`
	Password   string `json:"password"`
}

type TokenResponse struct {
	Token  string    `json:"token"`
	Expire time.Time `json:"expire"`
}

func (f *authenticateForm) Authenticate(tidbForwarder *tidb.Forwarder) (*utils.SessionUser, error) {
	// TODO: Support non TiDB auth
	if !f.IsTiDBAuth {
		return nil, ErrSignInUnsupportedAuthType.New("unsupported auth type, only TiDB auth is supported")
	}
	db, err := tidbForwarder.OpenTiDB(f.Username, f.Password)
	if err != nil {
		if errorx.Cast(err) == nil {
			return nil, ErrSignInOther.WrapWithNoMessage(err)
		}
		// Possible errors could be:
		// tidb.ErrNoAliveTiDB
		// tidb.ErrPDAccessFailed
		// tidb.ErrTiDBConnFailed
		// tidb.ErrTiDBAuthFailed
		return nil, err
	}
	defer db.Close() //nolint:errcheck

	// TODO: Fill privilege tables here
	return &utils.SessionUser{
		IsTiDBAuth:   f.IsTiDBAuth,
		TiDBUsername: f.Username,
		TiDBPassword: f.Password,
	}, nil
}

func NewAuthService(tidbForwarder *tidb.Forwarder) *AuthService {
	var secret *[32]byte

	secretStr := os.Getenv("DASHBOARD_SESSION_SECRET")
	switch len(secretStr) {
	case 0:
		secret = cryptopasta.NewEncryptionKey()
	case 32:
		log.Info("DASHBOARD_SESSION_SECRET is overridden from env var")
		secret = &[32]byte{}
		copy(secret[:], secretStr)
	default:
		log.Warn("DASHBOARD_SESSION_SECRET does not meet the 32 byte size requirement, ignored")
		secret = cryptopasta.NewEncryptionKey()
	}

	middleware, err := jwt.New(&jwt.GinJWTMiddleware{
		IdentityKey: utils.SessionUserKey,
		Realm:       "dashboard",
		Key:         secret[:],
		Timeout:     time.Hour * 24,
		MaxRefresh:  time.Hour * 24,
		Authenticator: func(c *gin.Context) (interface{}, error) {
			var form authenticateForm
			if err := c.ShouldBindJSON(&form); err != nil {
				return nil, utils.ErrInvalidRequest.WrapWithNoMessage(err)
			}
			u, err := form.Authenticate(tidbForwarder)
			if err != nil {
				return nil, errorx.Decorate(err, "authenticate failed")
			}
			return u, nil
		},
		PayloadFunc: func(data interface{}) jwt.MapClaims {
			user, ok := data.(*utils.SessionUser)
			if !ok {
				return jwt.MapClaims{}
			}
			// `user` contains sensitive information, thus it is encrypted in the token.
			// In order to be simple, we keep using JWS instead of JWE for thus scenario.
			plain, err := json.Marshal(user)
			if err != nil {
				return jwt.MapClaims{}
			}
			encrypted, err := cryptopasta.Encrypt(plain, secret)
			if err != nil {
				return jwt.MapClaims{}
			}
			return jwt.MapClaims{
				"p": base64.StdEncoding.EncodeToString(encrypted),
			}
		},
		IdentityHandler: func(c *gin.Context) interface{} {
			claims := jwt.ExtractClaims(c)

			encoded, ok := claims["p"].(string)
			if !ok {
				return nil
			}
			decoded, err := base64.StdEncoding.DecodeString(encoded)
			if err != nil {
				return nil
			}
			decrypted, err := cryptopasta.Decrypt(decoded, secret)
			if err != nil {
				return nil
			}
			var user utils.SessionUser
			if err := json.Unmarshal(decrypted, &user); err != nil {
				return nil
			}
			return &user
		},
		Authorizator: func(data interface{}, c *gin.Context) bool {
			// Ensure identity is valid
			if data == nil {
				return false
			}
			user := data.(*utils.SessionUser)
			if user == nil {
				return false
			}
			// Currently we don't support privileges, so only root user is allowed to sign in.
			if user.TiDBUsername != "root" {
				return false
			}
			return true
		},
		HTTPStatusMessageFunc: func(e error, c *gin.Context) string {
			var err error
			if errorxErr := errorx.Cast(e); errorxErr != nil {
				// If the error is an errorx, use it directly.
				err = e
			} else if errors.Is(e, jwt.ErrFailedTokenCreation) {
				// Try to catch other sign in failure errors.
				err = ErrSignInOther.WrapWithNoMessage(e)
			} else {
				// The remaining error comes from checking tokens for protected endpoints.
				err = utils.ErrUnauthorized.NewWithNoMessage()
			}
			_ = c.Error(err)
			return err.Error()
		},
		Unauthorized: func(c *gin.Context, code int, message string) {
			c.Status(code)
		},
		LoginResponse: func(c *gin.Context, code int, token string, expire time.Time) {
			c.JSON(http.StatusOK, TokenResponse{
				Token:  token,
				Expire: expire,
			})
		},
	})

	if err != nil {
		// Error only comes from configuration errors. Fatal is fine.
		log.Fatal("Failed to configure auth service", zap.Error(err))
	}

	return &AuthService{middleware: middleware}
}

func (s *AuthService) Register(r *gin.RouterGroup) {
	endpoint := r.Group("/user")
	endpoint.POST("/login", s.loginHandler)
}

// MWAuthRequired creates a middleware that verifies the authentication token (JWT) in the request. If the token
// is valid, identity information will be attached in the context. If there is no authentication token, or the
// token is invalid, subsequent handlers will be skipped and errors will be generated.
func (s *AuthService) MWAuthRequired() gin.HandlerFunc {
	return s.middleware.MiddlewareFunc()
}

// @Summary Log in
// @Description Log into dashboard.
// @Accept json
// @Param message body authenticateForm true "Credentials"
// @Success 200 {object} TokenResponse
// @Failure 401 {object} utils.APIError "Login failure"
// @Router /user/login [post]
func (s *AuthService) loginHandler(c *gin.Context) {
	s.middleware.LoginHandler(c)
}
