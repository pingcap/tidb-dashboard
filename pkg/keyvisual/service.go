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

package keyvisual

import (
	"context"
	"encoding/hex"
	"math"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/pingcap/log"
	"go.uber.org/zap"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/user"
	// Import for swag go doc
	_ "github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/keyvisual/decorator"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/keyvisual/input"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/keyvisual/matrix"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/keyvisual/region"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/keyvisual/storage"
)

const (
	maxDisplayY = 1536
)

var (
	defaultStatConfig = storage.StatConfig{
		LayersConfig: []storage.LayerConfig{
			{Len: 60, Ratio: 2 / 1},                     // step 1 minutes, total 60, 1 hours (sum: 1 hours)
			{Len: 60 / 2 * 7, Ratio: 6 / 2},             // step 2 minutes, total 210, 7 hours (sum: 8 hours)
			{Len: 60 / 6 * 16, Ratio: 30 / 6},           // step 6 minutes, total 160, 16 hours (sum: 1 days)
			{Len: 60 / 30 * 24 * 6, Ratio: 4 * 60 / 30}, // step 30 minutes, total 288, 6 days (sum: 1 weeks)
			{Len: 24 / 4 * 28, Ratio: 0},                // step 4 hours, total 168, 4 weeks (sum: 5 weeks)
		},
	}
)

type Service struct {
	ctx    context.Context
	cancel context.CancelFunc
	wg     sync.WaitGroup

	config   *config.Config
	provider *region.PDDataProvider

	in       input.StatInput
	stat     *storage.Stat
	strategy matrix.Strategy
}

func NewService(ctx context.Context, cfg *config.Config, provider *region.PDDataProvider) *Service {
	ctx, cancel := context.WithCancel(ctx)
	srv := &Service{
		ctx:      ctx,
		cancel:   cancel,
		config:   cfg,
		provider: provider,
	}
	wg := &srv.wg
	srv.in = input.NewStatInput(ctx, provider)
	labelStrategy := decorator.TiDBLabelStrategy(ctx, provider)
	srv.strategy = matrix.DistanceStrategy(ctx, wg, labelStrategy, 1.0/math.Phi, 15, 50)
	srv.stat = storage.NewStat(ctx, wg, provider, defaultStatConfig, srv.strategy, srv.in.GetStartTime())
	return srv
}

func (s *Service) Start() {
	s.wg.Add(2)
	go func() {
		s.strategy.Background()
		s.wg.Done()
	}()
	go func() {
		s.in.Background(s.stat)
		s.wg.Done()
	}()
}

func (s *Service) Close() {
	s.cancel()
	s.wg.Wait()
}

func (s *Service) Register(r *gin.RouterGroup, auth *user.AuthService) {
	endpoint := r.Group("/keyvisual")
	endpoint.Use(auth.MWAuthRequired())
	endpoint.GET("/heatmaps", s.heatmapsHandler)
}

// @Summary Key Visual Heatmaps
// @Description Heatmaps in a given range to visualize TiKV usage
// @Produce json
// @Param startkey query string false "The start of the key range"
// @Param endkey query string false "The end of the key range"
// @Param starttime query int false "The start of the time range (Unix)"
// @Param endtime query int false "The end of the time range (Unix)"
// @Param type query string false "Main types of data" Enums(written_bytes, read_bytes, written_keys, read_keys, integration)
// @Success 200 {object} matrix.Matrix
// @Router /keyvisual/heatmaps [get]
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) heatmapsHandler(c *gin.Context) {
	startKey := c.Query("startkey")
	endKey := c.Query("endkey")
	startTimeString := c.Query("starttime")
	endTimeString := c.Query("endtime")
	typ := c.Query("type")

	endTime := time.Now()
	startTime := endTime.Add(-360 * time.Minute)
	if startTimeString != "" {
		tsSec, err := strconv.ParseInt(startTimeString, 10, 64)
		if err != nil {
			log.Error("parse ts failed", zap.Error(err))
			c.JSON(http.StatusBadRequest, "bad request")
			return
		}
		startTime = time.Unix(tsSec, 0)
	}
	if endTimeString != "" {
		tsSec, err := strconv.ParseInt(endTimeString, 10, 64)
		if err != nil {
			log.Error("parse ts failed", zap.Error(err))
			c.JSON(http.StatusBadRequest, "bad request")
			return
		}
		endTime = time.Unix(tsSec, 0)
	}
	if !(startTime.Before(endTime) && (endKey == "" || startKey < endKey)) {
		c.JSON(http.StatusBadRequest, "bad request")
		return
	}

	log.Debug("Request matrix",
		zap.Time("start-time", startTime),
		zap.Time("end-time", endTime),
		zap.String("start-key", startKey),
		zap.String("end-key", endKey),
		zap.String("type", typ),
	)

	if startKeyBytes, err := hex.DecodeString(startKey); err == nil {
		startKey = string(startKeyBytes)
	} else {
		c.JSON(http.StatusBadRequest, "bad request")
		return
	}
	if endKeyBytes, err := hex.DecodeString(endKey); err == nil {
		endKey = string(endKeyBytes)
	} else {
		c.JSON(http.StatusBadRequest, "bad request")
		return
	}
	baseTag := region.IntoTag(typ)
	plane := s.stat.Range(startTime, endTime, startKey, endKey, baseTag)
	resp := plane.Pixel(s.strategy, maxDisplayY, region.GetDisplayTags(baseTag))
	resp.Range(startKey, endKey)
	// TODO: An expedient to reduce data transmission, which needs to be deleted later.
	resp.DataMap = map[string][][]uint64{
		typ: resp.DataMap[typ],
	}
	// ----------
	c.JSON(http.StatusOK, resp)
}
