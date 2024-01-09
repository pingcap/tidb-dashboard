// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package sso

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"net/url"
	"os"
	"path"
	"strings"
	"sync"
	"time"

	"github.com/go-resty/resty/v2"
	"github.com/gtank/cryptopasta"
	"github.com/joomcode/errorx"
	"github.com/pingcap/log"
	"go.uber.org/fx"
	"go.uber.org/zap"
	"golang.org/x/oauth2"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/pkg/config"
	"github.com/pingcap/tidb-dashboard/pkg/dbstore"
	"github.com/pingcap/tidb-dashboard/pkg/tidb"
)

var (
	ErrNS                           = errorx.NewNamespace("error.api.user.sso")
	ErrUnsupportedUser              = ErrNS.NewType("unsupported_user")
	ErrInvalidImpersonateCredential = ErrNS.NewType("invalid_impersonate_credential")
	ErrDiscoverFailed               = ErrNS.NewType("discover_failed")
	ErrBadConfig                    = ErrNS.NewType("bad_config")
	ErrOIDCInternalErr              = ErrNS.NewType("oidc_internal_err")
)

const (
	discoveryTimeout = time.Second * 30
	exchangeTimeout  = time.Second * 30
	userInfoTimeout  = time.Second * 30
)

type ServiceParams struct {
	fx.In
	LocalStore    *dbstore.DB
	TiDBClient    *tidb.Client
	ConfigManager *config.DynamicConfigManager
}

type Service struct {
	params           ServiceParams
	lifecycleCtx     context.Context
	oauthStateSecret []byte

	encKeyPath string
	encKeyLock sync.Mutex

	createImpersonationLock sync.Mutex
}

func NewService(p ServiceParams, lc fx.Lifecycle, config *config.Config) (*Service, error) {
	if err := autoMigrate(p.LocalStore); err != nil {
		return nil, err
	}
	s := &Service{
		params:                  p,
		oauthStateSecret:        cryptopasta.NewHMACKey()[:],
		encKeyPath:              path.Join(config.DataDir, "dbek.bin"),
		encKeyLock:              sync.Mutex{},
		createImpersonationLock: sync.Mutex{},
	}
	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			s.lifecycleCtx = ctx
			return nil
		},
	})
	return s, nil
}

var Module = fx.Options(
	fx.Provide(NewService),
	fx.Invoke(registerRouter),
)

func (s *Service) getMasterEncKey() (*[32]byte, error) {
	b, err := os.ReadFile(s.encKeyPath)
	if err != nil {
		// Key does not exist
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}
	if len(b) != 32 {
		return nil, fmt.Errorf("encryption key is broken")
	}

	var fixedLenKey [32]byte
	copy(fixedLenKey[:], b)

	return &fixedLenKey, nil
}

// This function is thread-safe.
func (s *Service) getOrCreateMasterEncKey() (*[32]byte, error) {
	s.encKeyLock.Lock()
	defer s.encKeyLock.Unlock()

	key, _ := s.getMasterEncKey()
	if key != nil {
		return key, nil
	}

	// Try to create a key otherwise
	key = cryptopasta.NewEncryptionKey()
	err := os.WriteFile(s.encKeyPath, key[:], 0o400) // read only for owner
	if err != nil {
		return nil, fmt.Errorf("persist key failed: %v", err)
	}
	return key, nil
}

// getAndDecryptImpersonation reads the impersonation record from local Sqlite and decrypt the record to get the
// plain SQL password. Currently this function only reads `root` user impersonation.
func (s *Service) getAndDecryptImpersonation() (string, string, error) {
	var imp SSOImpersonationModel
	err := s.params.LocalStore.
		First(&imp).Error
	if err != nil {
		return "", "", fmt.Errorf("bad record: %v", err)
	}
	key, err := s.getMasterEncKey()
	if err != nil {
		return "", "", fmt.Errorf("bad encryption key: %v", err)
	}
	if key == nil {
		return "", "", fmt.Errorf("encryption key is missing")
	}
	encrypted, err := hex.DecodeString(imp.EncryptedPass)
	if err != nil {
		return "", "", fmt.Errorf("bad record: %v", err)
	}
	decryptedPass, err := cryptopasta.Decrypt(encrypted, key)
	if err != nil {
		return "", "", fmt.Errorf("bad record: %v", err)
	}
	return imp.SQLUser, string(decryptedPass), nil
}

func (s *Service) updateImpersonationStatus(user string, status ImpersonateStatus) error {
	return s.params.LocalStore.
		Model(&SSOImpersonationModel{}).
		Where("sql_user = ?", user).
		Update("last_impersonate_status", status).
		Error
}

// newSessionFromImpersonation creates a new session from the impersonation records.
func (s *Service) newSessionFromImpersonation(userInfo *oAuthUserInfo, idToken string) (*utils.SessionUser, error) {
	dc, err := s.params.ConfigManager.Get()
	if err != nil {
		return nil, err
	}

	userName, password, err := s.getAndDecryptImpersonation()
	if err != nil {
		return nil, err
	}

	// Check whether this user can access dashboard
	writeable, err := user.VerifySQLUser(s.params.TiDBClient, userName, password)
	if err != nil {
		if errorx.IsOfType(err, tidb.ErrTiDBAuthFailed) {
			_ = s.updateImpersonationStatus(userName, ImpersonateStatusAuthFail)
			return nil, ErrInvalidImpersonateCredential.Wrap(err, "Invalid SQL credential")
		}
		if errorx.IsOfType(err, user.ErrInsufficientPrivs) {
			_ = s.updateImpersonationStatus(userName, ImpersonateStatusInsufficientPrivs)
			return nil, ErrInvalidImpersonateCredential.Wrap(err, "Insufficient privileges")
		}
		return nil, err
	}
	_ = s.updateImpersonationStatus(userName, ImpersonateStatusSuccess)

	return &utils.SessionUser{
		Version:      utils.SessionVersion,
		HasTiDBAuth:  true,
		TiDBUsername: userName,
		TiDBPassword: password,
		DisplayName:  userInfo.Email,
		IsShareable:  true,
		IsWriteable:  writeable && !dc.SSO.CoreConfig.IsReadOnly,
		OIDCIDToken:  idToken,
	}, nil
}

func (s *Service) createImpersonation(userName string, password string) (*SSOImpersonationModel, error) {
	{
		// Check whether this user can access dashboard
		_, err := user.VerifySQLUser(s.params.TiDBClient, userName, password)
		if err != nil {
			if errorx.IsOfType(err, tidb.ErrTiDBAuthFailed) {
				return nil, ErrInvalidImpersonateCredential.Wrap(err, "Invalid SQL credential")
			}
			if errorx.IsOfType(err, user.ErrInsufficientPrivs) {
				return nil, ErrInvalidImpersonateCredential.Wrap(err, "Insufficient privileges")
			}
			return nil, err
		}
	}
	key, err := s.getOrCreateMasterEncKey()
	if err != nil {
		return nil, err
	}
	encrypted, err := cryptopasta.Encrypt([]byte(password), key)
	if err != nil {
		return nil, err
	}
	encryptedInHex := hex.EncodeToString(encrypted)

	record := &SSOImpersonationModel{
		SQLUser:               userName,
		EncryptedPass:         encryptedInHex,
		LastImpersonateStatus: nil,
	}
	// currently, we only support to authorize one sql user
	s.createImpersonationLock.Lock()
	defer s.createImpersonationLock.Unlock()

	err = s.revokeAllImpersonations()
	if err != nil {
		return nil, err
	}
	err = s.params.LocalStore.Create(&record).Error
	if err != nil {
		return nil, err
	}
	return record, nil
}

func (s *Service) revokeAllImpersonations() error {
	sqlStr := fmt.Sprintf("DELETE FROM `%s`", SSOImpersonationModel{}.TableName()) // #nosec
	return s.params.LocalStore.
		Exec(sqlStr).
		Error
}

type oidcWellKnownConfig struct {
	Issuer                           string   `json:"issuer"`
	AuthURL                          string   `json:"authorization_endpoint"`
	TokenURL                         string   `json:"token_endpoint"`
	UserInfoURL                      string   `json:"userinfo_endpoint"`
	EndSessionURL                    string   `json:"end_session_endpoint"`
	JWKSURI                          string   `json:"jwks_uri"`
	ResponseTypesSupported           []string `json:"response_types_supported"`
	SubjectTypesSupported            []string `json:"subject_types_supported"`
	IDTokenSigningAlgValuesSupported []string `json:"id_token_signing_alg_values_supported"`
}

func (s *Service) discoverOIDC(issuer string) (*oidcWellKnownConfig, error) {
	issuer = strings.TrimSuffix(issuer, "/")
	if !strings.HasPrefix(issuer, "http://") && !strings.HasPrefix(issuer, "https://") {
		issuer = "https://" + issuer
	}
	_, err := url.Parse(issuer)
	if err != nil {
		return nil, ErrDiscoverFailed.Wrap(err, "Invalid URL format")
	}

	ctx, cancel := context.WithTimeout(s.lifecycleCtx, discoveryTimeout)
	defer cancel()

	wellKnownURL := issuer + "/.well-known/openid-configuration"
	resp, err := resty.New().R().SetContext(ctx).SetResult(&oidcWellKnownConfig{}).Get(wellKnownURL)
	if err != nil {
		return nil, ErrDiscoverFailed.Wrap(err, "Failed to discover OIDC endpoints")
	}
	wellKnownConfig := resp.Result().(*oidcWellKnownConfig)
	if strings.TrimSuffix(wellKnownConfig.Issuer, "/") != issuer {
		return nil, ErrDiscoverFailed.New("Issuer did not match in the OIDC provider, expect %s, got %s", issuer, wellKnownConfig.Issuer)
	}
	if len(wellKnownConfig.TokenURL) == 0 {
		return nil, ErrDiscoverFailed.New("token_endpoint is not provided in the OIDC provider")
	}
	if len(wellKnownConfig.AuthURL) == 0 {
		return nil, ErrDiscoverFailed.New("authorization_endpoint is not provided in the OIDC provider")
	}
	if len(wellKnownConfig.UserInfoURL) == 0 {
		return nil, ErrDiscoverFailed.New("userinfo_endpoint is not provided in the OIDC provider")
	}
	if len(wellKnownConfig.JWKSURI) == 0 {
		return nil, ErrDiscoverFailed.New("jwks_uri is not provided in the OIDC provider")
	}
	if len(wellKnownConfig.ResponseTypesSupported) == 0 {
		return nil, ErrDiscoverFailed.New("response_types_supported is not provided in the OIDC provider")
	}
	if len(wellKnownConfig.SubjectTypesSupported) == 0 {
		return nil, ErrDiscoverFailed.New("subject_types_supported is not provided in the OIDC provider")
	}
	if len(wellKnownConfig.IDTokenSigningAlgValuesSupported) == 0 {
		return nil, ErrDiscoverFailed.New("id_token_signing_alg_values_supported is not provided in the OIDC provider")
	}
	return wellKnownConfig, nil
}

func (s *Service) IsEnabled() (bool, error) {
	dc, err := s.params.ConfigManager.Get()
	if err != nil {
		return false, err
	}
	return dc.SSO.CoreConfig.Enabled, nil
}

func (s *Service) buildOAuth2Config(redirectURL string) (*oauth2.Config, error) {
	dc, err := s.params.ConfigManager.Get()
	if err != nil {
		return nil, err
	}
	if !dc.SSO.CoreConfig.Enabled {
		return nil, ErrBadConfig.New("SSO is not enabled")
	}
	scopes := []string{"openid", "profile", "email"}
	if len(dc.SSO.CoreConfig.Scopes) > 0 {
		userSupplied := strings.Split(dc.SSO.CoreConfig.Scopes, " ")
		scopes = append(scopes, userSupplied...)
	}
	return &oauth2.Config{
		ClientID:     dc.SSO.CoreConfig.ClientID,
		ClientSecret: dc.SSO.CoreConfig.ClientSecret,
		RedirectURL:  redirectURL,
		Endpoint: oauth2.Endpoint{
			AuthURL:  dc.SSO.AuthURL,
			TokenURL: dc.SSO.TokenURL,
		},
		Scopes: scopes,
	}, nil
}

// buildOAuthURL builds an OAuth URL (to be redirected by the browser) if OIDC SSO is enabled.
// Returns nil if OIDC SSO is not enabled.
//
// `state` is generated by the browser, persisted in local storage and to be verified later before exchange.
//
//	Browser uses this to ensure that the auth callback is not replayed (by an CSRF attacker that use another state).
//
// `codeVerifier` is also generated by the browser, persisted in local storage and will be presented to the RP at exchange.
//
//	RP uses this to ensure that the exchange request is indeed issued by the same client (browser instance).
func (s *Service) buildOAuthURL(redirectURL string, state string, codeVerifier string) (string, error) {
	oauthConfig, err := s.buildOAuth2Config(redirectURL)
	if err != nil {
		return "", err
	}

	// generate PKCE code challenge, which is base64(sha256(codeVerifier)).
	h := sha256.New()
	_, _ = h.Write([]byte(codeVerifier))
	codeChallenge := base64.RawURLEncoding.EncodeToString(h.Sum(nil))

	authURL := oauthConfig.AuthCodeURL(state,
		oauth2.SetAuthURLParam("code_challenge", codeChallenge),
		oauth2.SetAuthURLParam("code_challenge_method", "S256"))
	return authURL, nil
}

func (s *Service) exchangeOAuthCode(redirectURL string, code string, codeVerifier string) (string, string, error) {
	oauthConfig, err := s.buildOAuth2Config(redirectURL)
	if err != nil {
		return "", "", err
	}

	ctx, cancel := context.WithTimeout(s.lifecycleCtx, exchangeTimeout)
	defer cancel()
	token, err := oauthConfig.Exchange(ctx, code, oauth2.SetAuthURLParam("code_verifier", codeVerifier))
	if err != nil {
		return "", "", ErrOIDCInternalErr.Wrap(err, "oidc: exchange failed")
	}

	idToken, ok := token.Extra("id_token").(string)
	if !ok {
		return "", "", ErrOIDCInternalErr.Wrap(err, "oidc: id_token not exist")
	}

	return token.AccessToken, idToken, nil
}

type oAuthUserInfo struct {
	Name  string `json:"name"`
	Email string `json:"email"`
}

func (s *Service) oAuthGetUserInfo(accessToken string) (*oAuthUserInfo, error) {
	dc, err := s.params.ConfigManager.Get()
	if err != nil {
		return nil, err
	}
	if !dc.SSO.CoreConfig.Enabled {
		return nil, ErrBadConfig.New("SSO is not enabled")
	}

	ctx, cancel := context.WithTimeout(s.lifecycleCtx, userInfoTimeout)
	defer cancel()

	resp, err := resty.New().R().SetContext(ctx).
		SetResult(&oAuthUserInfo{}).
		SetAuthToken(accessToken).
		Get(dc.SSO.UserInfoURL)
	if err != nil {
		return nil, ErrOIDCInternalErr.Wrap(err, "Failed to read user info")
	}
	info := resp.Result().(*oAuthUserInfo)
	return info, nil
}

func (s *Service) NewSessionFromOAuthExchange(redirectURL string, code string, codeVerifier string) (*utils.SessionUser, error) {
	ak, idToken, err := s.exchangeOAuthCode(redirectURL, code, codeVerifier)
	if err != nil {
		return nil, ErrBadConfig.Wrap(err, "SSO is not configured correctly")
	}

	info, err := s.oAuthGetUserInfo(ak)
	if err != nil {
		// This is likely not a configuration error
		return nil, err
	}

	log.Info("New session via SSO", zap.Any("userinfo", info))

	u, err := s.newSessionFromImpersonation(info, idToken)
	if err != nil {
		return nil, ErrBadConfig.Wrap(err, "SSO is not configured correctly")
	}
	return u, nil
}

func (s *Service) BuildEndSessionURL(user *utils.SessionUser, redirectURL string) (string, error) {
	dc, err := s.params.ConfigManager.Get()
	if err != nil {
		return "", err
	}
	if !dc.SSO.CoreConfig.Enabled {
		return "", ErrBadConfig.New("SSO is not enabled")
	}
	u, err := url.Parse(dc.SSO.SignOutURL)
	if err != nil {
		return "", ErrBadConfig.Wrap(err, "Bad end session URL")
	}
	q := u.Query()
	q.Add("client_id", dc.SSO.CoreConfig.ClientID)
	q.Add("id_token_hint", user.OIDCIDToken)
	if len(redirectURL) > 0 {
		q.Add("post_logout_redirect_uri", redirectURL)
	}
	u.RawQuery = q.Encode()

	return u.String(), nil
}
