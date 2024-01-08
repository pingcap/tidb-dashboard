// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package sso

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/joomcode/errorx"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/pkg/config"
	"github.com/pingcap/tidb-dashboard/util/rest"
)

func registerRouter(r *gin.RouterGroup, auth *user.AuthService, s *Service) {
	endpoint := r.Group("/user/sso")
	endpoint.GET("/auth_url", s.getAuthURLHandler)
	endpoint.Use(auth.MWAuthRequired())
	// TODO: Forbid modifying config when signed in as SSO.
	endpoint.GET("/impersonations/list", s.listImpersonationHandler)
	endpoint.POST("/impersonation", auth.MWRequireWritePriv(), s.createImpersonationHandler)
	endpoint.GET("/config", s.getConfig)
	endpoint.PUT("/config", auth.MWRequireWritePriv(), s.setConfig)
}

type GetAuthURLRequest struct {
	RedirectURL  string `json:"redirect_url" form:"redirect_url"`
	CodeVerifier string `json:"code_verifier" form:"code_verifier"`
	State        string `json:"state" form:"state"`
}

// @ID userSSOGetAuthURL
// @Summary Get SSO Auth URL
// @Param q query GetAuthURLRequest true "Query"
// @Success 200 {string} string
// @Router /user/sso/auth_url [get]
func (s *Service) getAuthURLHandler(c *gin.Context) {
	var req GetAuthURLRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		rest.Error(c, rest.ErrBadRequest.NewWithNoMessage())
		return
	}
	authURL, err := s.buildOAuthURL(req.RedirectURL, req.State, req.CodeVerifier)
	if err != nil {
		rest.Error(c, err)
		return
	}
	c.String(http.StatusOK, authURL)
}

// @ID userSSOListImpersonations
// @Summary List all impersonations
// @Success 200 {array} SSOImpersonationModel
// @Router /user/sso/impersonations/list [get]
// @Security JwtAuth
// @Failure 401 {object} rest.ErrorResponse
func (s *Service) listImpersonationHandler(c *gin.Context) {
	var resp []SSOImpersonationModel
	err := s.params.LocalStore.Find(&resp).Error
	if err != nil {
		rest.Error(c, err)
		return
	}
	c.JSON(http.StatusOK, resp)
}

type CreateImpersonationRequest struct {
	SQLUser  string `json:"sql_user"`
	Password string `json:"password"`
}

// @ID userSSOCreateImpersonation
// @Summary Create an impersonation
// @Param request body CreateImpersonationRequest true "Request body"
// @Success 200 {object} SSOImpersonationModel
// @Router /user/sso/impersonation [post]
// @Security JwtAuth
// @Failure 400 {object} rest.ErrorResponse
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
func (s *Service) createImpersonationHandler(c *gin.Context) {
	var req CreateImpersonationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		rest.Error(c, rest.ErrBadRequest.NewWithNoMessage())
		return
	}

	rec, err := s.createImpersonation(req.SQLUser, req.Password)
	if err != nil {
		rest.Error(c, err)
		if errorx.IsOfType(err, ErrUnsupportedUser) || errorx.IsOfType(err, ErrInvalidImpersonateCredential) {
			c.Status(http.StatusBadRequest)
		}
		return
	}

	c.JSON(http.StatusOK, rec)
}

// @ID userSSOGetConfig
// @Summary Get SSO config
// @Success 200 {object} config.SSOCoreConfig
// @Router /user/sso/config [get]
// @Security JwtAuth
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
func (s *Service) getConfig(c *gin.Context) {
	dc, err := s.params.ConfigManager.Get()
	if err != nil {
		rest.Error(c, err)
		return
	}
	// Hide client secret for security
	dc.SSO.CoreConfig.ClientSecret = ""
	c.JSON(http.StatusOK, dc.SSO.CoreConfig)
}

type SetConfigRequest struct {
	Config config.SSOCoreConfig `json:"config"`
}

// @ID userSSOSetConfig
// @Summary Set SSO config
// @Param request body SetConfigRequest true "Request body"
// @Success 200 {object} config.SSOCoreConfig
// @Router /user/sso/config [put]
// @Security JwtAuth
// @Failure 400 {object} rest.ErrorResponse
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
func (s *Service) setConfig(c *gin.Context) {
	var req SetConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		rest.Error(c, rest.ErrBadRequest.NewWithNoMessage())
		return
	}

	dConfig := config.SSOConfig{CoreConfig: req.Config}
	if req.Config.Enabled {
		wellKnownConfig, err := s.discoverOIDC(req.Config.DiscoveryURL)
		if err != nil {
			rest.Error(c, rest.ErrBadRequest.WrapWithNoMessage(err))
			return
		}
		dConfig.AuthURL = wellKnownConfig.AuthURL
		dConfig.TokenURL = wellKnownConfig.TokenURL
		dConfig.UserInfoURL = wellKnownConfig.UserInfoURL
		dConfig.SignOutURL = wellKnownConfig.EndSessionURL // This is optional
	} else {
		err := s.revokeAllImpersonations()
		if err != nil {
			rest.Error(c, err)
			return
		}
	}

	var opt config.DynamicConfigOption = func(dc *config.DynamicConfig) {
		dc.SSO = dConfig
	}
	if err := s.params.ConfigManager.Modify(opt); err != nil {
		rest.Error(c, err)
		return
	}
	c.JSON(http.StatusOK, req.Config)
}
