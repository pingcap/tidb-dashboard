// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package code

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/util/rest"
)

func registerRouter(r *gin.RouterGroup, auth *user.AuthService, s *Service) {
	endpoint := r.Group("/user/share")
	endpoint.Use(auth.MWAuthRequired())
	endpoint.POST("/code", auth.MWRequireSharePriv(), s.ShareHandler)
	endpoint.POST("/revoke", auth.MWRequireSharePriv(), s.RevokeHandler)
}

type ShareRequest struct {
	ExpireInSeconds int64 `json:"expire_in_sec"`
	RevokeWritePriv bool  `json:"revoke_write_priv"`
}

type ShareResponse struct {
	Code string `json:"code"`
}

// @ID userShareSession
// @Summary Share current session and generate a sharing code
// @Param request body ShareRequest true "Request body"
// @Security JwtAuth
// @Success 200 {object} ShareResponse
// @Router /user/share/code [post]
func (s *Service) ShareHandler(c *gin.Context) {
	var req ShareRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		rest.Error(c, rest.ErrBadRequest.NewWithNoMessage())
		return
	}

	expiry := time.Second * time.Duration(req.ExpireInSeconds)

	if expiry > MaxSessionShareExpiry || expiry < 0 {
		rest.Error(c, rest.ErrBadRequest.New("Invalid share expiry"))
		return
	}

	sessionUser := utils.GetSession(c)
	code := s.SharingCodeFromSession(sessionUser, expiry, req.RevokeWritePriv)
	if code == nil {
		rest.Error(c, ErrShareFailed.New("Share session failed"))
		return
	}

	c.JSON(http.StatusOK, ShareResponse{Code: *code})
}

// @ID userRevokeSession
// @Summary Reset encryption key to revoke all authorized codes
// @Security JwtAuth
// @Success 200
// @Router /user/share/revoke [post]
func (s *Service) RevokeHandler(c *gin.Context) {
	s.ResetEncryptionKey()
	c.JSON(http.StatusOK, nil)
}
