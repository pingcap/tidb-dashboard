package code

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/util/rest/resterror"
)

func registerRouter(r *gin.RouterGroup, auth *user.AuthService, s *Service) {
	endpoint := r.Group("/user/share")
	endpoint.Use(auth.MWAuthRequired())
	endpoint.POST("/code", auth.MWRequireSharePriv(), s.shareHandler)
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
func (s *Service) shareHandler(c *gin.Context) {
	var req ShareRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		_ = c.Error(resterror.ErrBadRequest.NewWithNoMessage())
		return
	}

	expiry := time.Second * time.Duration(req.ExpireInSeconds)

	if expiry > MaxSessionShareExpiry || expiry < 0 {
		_ = c.Error(resterror.ErrBadRequest.New("Invalid share expiry"))
		return
	}

	sessionUser := utils.GetSession(c)
	code := s.SharingCodeFromSession(sessionUser, expiry, req.RevokeWritePriv)
	if code == nil {
		_ = c.Error(ErrShareFailed.New("Share session failed"))
		return
	}

	c.JSON(http.StatusOK, ShareResponse{Code: *code})
}
