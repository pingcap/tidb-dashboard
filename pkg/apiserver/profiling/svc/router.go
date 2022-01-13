// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package svc

import (
	"github.com/gin-gonic/gin"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/profiling/svc/model"
)

func RegisterRouter(r *gin.RouterGroup, s *Service) {
	r.GET("/profiling/targets/list", append(
		s.backend.AuthFn(model.OpListTargets),
		s.ListTargets,
	)...)

	r.POST("/profiling/bundle/start", append(
		s.backend.AuthFn(model.OpStartBundle),
		s.StartBundle,
	)...)

	r.POST("/profiling/bundle/list", append(
		s.backend.AuthFn(model.OpListBundles),
		s.ListBundles,
	)...)

	r.POST("/profiling/bundle/get", append(
		s.backend.AuthFn(model.OpGetBundle),
		s.GetBundle,
	)...)

	r.POST("/profiling/bundle/download_token", append(
		s.backend.AuthFn(model.OpGetBundleData),
		s.GetTokenForBundleData,
	)...)

	r.GET("/profiling/bundle/download",
		s.DownloadBundleData,
	)

	r.POST("/profiling/profile/download_token", append(
		s.backend.AuthFn(model.OpGetProfileData),
		s.GetTokenForProfileData,
	)...)

	r.GET("/profiling/profile/render",
		s.RenderProfileData,
	)
}
