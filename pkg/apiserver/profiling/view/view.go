// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package view

import (
	"archive/zip"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt"
	"github.com/pingcap/log"
	"go.uber.org/zap"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/profiling/profutil"
	"github.com/pingcap/tidb-dashboard/util/jsonserde/ginjson"
	"github.com/pingcap/tidb-dashboard/util/rest"
	"github.com/pingcap/tidb-dashboard/util/rest/download"
)

type View struct {
	model                 Model
	downloadCtl           *download.Controller
	downloadTokenValidity time.Duration
}

func NewView(model Model) *View {
	return &View{
		model:                 model,
		downloadCtl:           download.NewController(),
		downloadTokenValidity: time.Hour,
	}
}

const bundleREADME = `
To review the CPU profiling or heap profiling result interactively:

$ go tool pprof --http=127.0.0.1:1234 cpu_xxx.proto
`

// ListTargets godoc
// @ID profilingListTargets
// @Summary List all available profiling targets
// @Description The list may be unordered.
// @Security JwtAuth
// @Success 200 {object} ListTargetsResp
// @Failure 500 {object} rest.ErrorResponse
// @Router /profiling/targets/list [post]
func (s *View) ListTargets(c *gin.Context) {
	ret, err := s.model.ListTargets()
	if err != nil {
		_ = c.Error(err)
		return
	}
	ginjson.Render(c, http.StatusOK, ret)
}

// StartBundle godoc
// @ID profilingStartBundle
// @Summary Start a bundle of profiling
// @Param req body StartBundleReq true "request"
// @Security JwtAuth
// @Success 200 {object} StartBundleResp
// @Failure 500 {object} rest.ErrorResponse
// @Router /profiling/bundle/start [post]
func (s *View) StartBundle(c *gin.Context) {
	var req StartBundleReq
	if err := c.ShouldBindWith(&req, ginjson.Binding); err != nil {
		_ = c.Error(rest.ErrBadRequest.WrapWithNoMessage(err))
		return
	}
	if len(req.Targets) == 0 {
		_ = c.Error(rest.ErrBadRequest.New("Expect at least 1 target"))
		return
	}
	if len(req.Kinds) == 0 {
		_ = c.Error(rest.ErrBadRequest.New("Expect at least 1 profiling kind"))
		return
	}
	for _, k := range req.Kinds {
		if !profutil.IsProfKindValid(k) {
			_ = c.Error(rest.ErrBadRequest.New("Unsupported profiling kind %s", k))
			return
		}
	}
	if req.DurationSec > 5*60 {
		req.DurationSec = 5 * 60
	}
	if req.DurationSec == 0 {
		req.DurationSec = 10
	}
	ret, err := s.model.StartBundle(req)
	if err != nil {
		_ = c.Error(err)
		return
	}
	ginjson.Render(c, http.StatusOK, ret)
}

// ListBundles godoc
// @ID profilingListBundles
// @Summary List all profiling bundles
// @Security JwtAuth
// @Success 200 {object} ListBundlesResp
// @Failure 500 {object} rest.ErrorResponse
// @Router /profiling/bundle/list [post]
func (s *View) ListBundles(c *gin.Context) {
	ret, err := s.model.ListBundles()
	if err != nil {
		_ = c.Error(err)
		return
	}
	ginjson.Render(c, http.StatusOK, ret)
}

// GetBundle godoc
// @ID profilingGetBundle
// @Summary Get the details of a profile bundle
// @Param req body GetBundleReq true "request"
// @Security JwtAuth
// @Success 200 {object} GetBundleResp
// @Failure 500 {object} rest.ErrorResponse
// @Router /profiling/bundle/get [post]
func (s *View) GetBundle(c *gin.Context) {
	var req GetBundleReq
	if err := c.ShouldBindWith(&req, ginjson.Binding); err != nil {
		_ = c.Error(rest.ErrBadRequest.WrapWithNoMessage(err))
		return
	}
	ret, err := s.model.GetBundle(req)
	if err != nil {
		_ = c.Error(err)
		return
	}
	ginjson.Render(c, http.StatusOK, ret)
}

type getBundleDataReqClaim struct {
	GetBundleDataReq
	jwt.StandardClaims
}

const audienceBundleData = "BundleData"

// GetTokenForBundleData godoc
// @ID profilingGetTokenForBundleData
// @Summary Get a token for downloading the bundle data as a zip
// @Param req body GetBundleDataReq true "request"
// @Security JwtAuth
// @Success 200 {string} string
// @Failure 500 {object} rest.ErrorResponse
// @Router /profiling/bundle/download_token [post]
func (s *View) GetTokenForBundleData(c *gin.Context) {
	var req GetBundleDataReq
	if err := c.ShouldBindWith(&req, ginjson.Binding); err != nil {
		_ = c.Error(rest.ErrBadRequest.WrapWithNoMessage(err))
		return
	}
	token, err := s.downloadCtl.GetDownloadToken(getBundleDataReqClaim{
		GetBundleDataReq: req,
		StandardClaims: jwt.StandardClaims{
			Audience:  audienceBundleData,
			ExpiresAt: time.Now().Add(s.downloadTokenValidity).Unix(),
		},
	})
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.String(http.StatusOK, token)
}

// DownloadBundleData godoc
// @ID profilingDownloadBundleData
// @Summary Download the bundle data as a zip using a download token from GetTokenForBundleData
// @Produce application/x-gzip
// @Param token query string true "download token"
// @Failure 500 {object} rest.ErrorResponse
// @Router /profiling/bundle/download [get]
func (s *View) DownloadBundleData(c *gin.Context) {
	var claim getBundleDataReqClaim
	token := c.Query("token")
	err := s.downloadCtl.HandleDownloadToken(token, &claim)
	if err != nil {
		_ = c.Error(rest.ErrBadRequest.WrapWithNoMessage(err))
		return
	}
	if !claim.VerifyAudience(audienceBundleData, true) {
		_ = c.Error(rest.ErrBadRequest.New("download token is invalid"))
		return
	}

	ret, err := s.model.GetBundleData(claim.GetBundleDataReq)
	if err != nil {
		_ = c.Error(err)
		return
	}

	fileName := fmt.Sprintf("profiling_%s.zip", time.Now().UTC().Format("2006_01_02_15_04_05"))
	c.Writer.Header().Set("Content-type", "application/octet-stream")
	c.Writer.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", fileName))

	zw := zip.NewWriter(c.Writer)

	var zipError error
	for _, profile := range ret.Profiles {
		if len(profile.Data) == 0 || profile.State != ProfileStateSucceeded {
			continue
		}
		zipFile, err := zw.CreateHeader(&zip.FileHeader{
			Name:     profile.FileName() + profile.DataType.Extension(),
			Method:   zip.Deflate,
			Modified: profile.StartAt,
		})
		if err != nil {
			zipError = err
			break
		}
		_, zipError = zipFile.Write(profile.Data)
		if zipError != nil {
			break
		}
	}
	if zipError == nil {
		zipFile, err := zw.CreateHeader(&zip.FileHeader{
			Name:     "README.md",
			Method:   zip.Deflate,
			Modified: time.Now().UTC(),
		})
		if err != nil {
			zipError = err
		} else {
			_, zipError = zipFile.Write([]byte(strings.TrimSpace(bundleREADME)))
		}
	}
	if zipError != nil {
		log.Warn("Error happened when generating the profiling bundle", zap.Error(zipError))
	}

	_ = zw.Close()
}

type RenderType string

const (
	RenderTypeUnchanged RenderType = "unchanged"
	RenderTypeSVGGraph  RenderType = "svg_graph"
)

type RenderProfileDataReq struct {
	GetProfileDataReq
	RenderAs RenderType
}

type renderProfileDataReqClaim struct {
	RenderProfileDataReq
	jwt.StandardClaims
}

const audienceProfileData = "ProfileData"

// GetTokenForProfileData godoc
// @ID profilingGetTokenForProfileData
// @Summary Get a token for downloading the profile data
// @Param req body RenderProfileDataReq true "request"
// @Security JwtAuth
// @Success 200 {string} string
// @Failure 500 {object} rest.ErrorResponse
// @Router /profiling/profile/download_token [post]
func (s *View) GetTokenForProfileData(c *gin.Context) {
	var req RenderProfileDataReq
	if err := c.ShouldBindWith(&req, ginjson.Binding); err != nil {
		_ = c.Error(rest.ErrBadRequest.WrapWithNoMessage(err))
		return
	}
	token, err := s.downloadCtl.GetDownloadToken(renderProfileDataReqClaim{
		RenderProfileDataReq: req,
		StandardClaims: jwt.StandardClaims{
			Audience:  audienceProfileData,
			ExpiresAt: time.Now().Add(s.downloadTokenValidity).Unix(),
		},
	})
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.String(http.StatusOK, token)
}

// RenderProfileData godoc
// @ID profilingRenderProfileData
// @Summary Render the profile data in a requested format using a download token from GetTokenForProfileData
// @Produce application/octet-stream
// @Param token query string true "download token"
// @Failure 500 {object} rest.ErrorResponse
// @Router /profiling/profile/render [get]
func (s *View) RenderProfileData(c *gin.Context) {
	var claim renderProfileDataReqClaim
	token := c.Query("token")
	err := s.downloadCtl.HandleDownloadToken(token, &claim)
	if err != nil {
		_ = c.Error(rest.ErrBadRequest.WrapWithNoMessage(err))
		return
	}
	if !claim.VerifyAudience(audienceProfileData, true) {
		_ = c.Error(rest.ErrBadRequest.New("download token is invalid"))
		return
	}

	ret, err := s.model.GetProfileData(claim.GetProfileDataReq)
	if err != nil {
		_ = c.Error(err)
		return
	}

	if ret.Profile.State != ProfileStateSucceeded {
		_ = c.Error(fmt.Errorf("the profile is not generated successfully"))
		return
	}

	switch claim.RenderAs {
	case "", RenderTypeUnchanged:
		if ret.Profile.DataType == profutil.ProfDataTypeText {
			c.Writer.Header().Set("Content-type", "text/plain")
		} else {
			c.Writer.Header().Set("Content-type", "application/octet-stream")
			c.Writer.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s%s\"", ret.Profile.FileName(), ret.Profile.DataType.Extension()))
		}
		_, _ = c.Writer.Write(ret.Profile.Data)
		return
	case RenderTypeSVGGraph:
		if ret.Profile.DataType != profutil.ProfDataTypeProtobuf {
			_ = c.Error(rest.ErrBadRequest.New("cannot render %s as %s", ret.Profile.DataType, claim.RenderAs))
			return
		}
		svgData, err := profutil.ConvertProtoToGraphSVG(ret.Profile.Data)
		if err != nil {
			_ = c.Error(err)
			return
		}
		c.Writer.Header().Set("Content-type", "image/svg+xml")
		_, _ = c.Writer.Write(svgData)
		return
	default:
		_ = c.Error(rest.ErrBadRequest.New("unsupported render type %s", claim.RenderAs))
		return
	}
}
