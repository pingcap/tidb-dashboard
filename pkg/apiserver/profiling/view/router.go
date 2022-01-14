// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package view

import (
	"github.com/gin-gonic/gin"
)

func RegisterRouter(r *gin.RouterGroup, s *View) {
	r.POST("/profiling/targets/list", append(
		s.model.AuthFn(OpListTargets),
		s.ListTargets,
	)...)

	r.POST("/profiling/bundle/start", append(
		s.model.AuthFn(OpStartBundle),
		s.StartBundle,
	)...)

	r.POST("/profiling/bundle/list", append(
		s.model.AuthFn(OpListBundles),
		s.ListBundles,
	)...)

	r.POST("/profiling/bundle/get", append(
		s.model.AuthFn(OpGetBundle),
		s.GetBundle,
	)...)

	r.POST("/profiling/bundle/download_token", append(
		s.model.AuthFn(OpGetBundleData),
		s.GetTokenForBundleData,
	)...)

	r.GET("/profiling/bundle/download",
		s.DownloadBundleData,
	)

	r.POST("/profiling/profile/download_token", append(
		s.model.AuthFn(OpGetProfileData),
		s.GetTokenForProfileData,
	)...)

	r.GET("/profiling/profile/render",
		s.RenderProfileData,
	)
}
