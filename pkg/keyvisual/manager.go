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
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/pingcap/log"
	"go.uber.org/fx"
	"go.uber.org/zap"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
)

func (s *Service) managerHook() fx.Hook {
	var wg sync.WaitGroup
	return fx.Hook{
		OnStart: func(ctx context.Context) error {
			wg.Add(1)
			go func() {
				s.managerLoop(ctx)
				wg.Done()
			}()
			return nil
		},
		OnStop: func(context.Context) error {
			wg.Wait()
			return nil
		},
	}
}

func (s *Service) managerLoop(ctx context.Context) {
	ch := s.cfgManager.NewPushChannel()
	for {
		select {
		case <-ctx.Done():
			s.stopService()
			return
		case cfg := <-ch:
			if cfg.KeyVisual.AutoCollectionEnabled {
				s.startService(ctx)
			} else {
				s.stopService()
			}
		}
	}
}

func (s *Service) startService(ctx context.Context) {
	if s.IsRunning() {
		return
	}
	if err := s.Start(ctx); err != nil {
		log.Error("Can not start key visual service", zap.Error(err))
	} else {
		log.Info("Key visual service is started")
	}
}

func (s *Service) stopService() {
	if !s.IsRunning() {
		return
	}
	if err := s.Stop(context.Background()); err != nil {
		log.Error("Can not stop key visual service", zap.Error(err))
	} else {
		log.Info("Key visual service is stopped")
	}
}

// @Summary Get Key Visual Dynamic Config
// @Produce json
// @Success 200 {object} config.KeyVisualConfig
// @Router /keyvisual/config [get]
// @Security JwtAuth
// @Failure 401 {object} utils.APIError "Unauthorized failure"
func (s *Service) getDynamicConfig(c *gin.Context) {
	c.JSON(http.StatusOK, s.cfgManager.Get().KeyVisual)
}

// @Summary Set Key Visual Dynamic Config
// @Produce json
// @Param request body config.KeyVisualConfig true "Request body"
// @Success 200 {object} config.KeyVisualConfig
// @Router /keyvisual/config [put]
// @Security JwtAuth
// @Failure 400 {object} utils.APIError
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Failure 500 {object} utils.APIError
func (s *Service) setDynamicConfig(c *gin.Context) {
	var req config.KeyVisualConfig
	if err := c.ShouldBindJSON(&req); err != nil {
		c.Status(http.StatusBadRequest)
		_ = c.Error(utils.ErrInvalidRequest.WrapWithNoMessage(err))
		return
	}
	var opt config.DynamicConfigOption = func(dc *config.DynamicConfig) {
		dc.KeyVisual = req
	}
	if err := s.cfgManager.Set(opt); err != nil {
		c.Status(http.StatusInternalServerError)
		_ = c.Error(utils.ErrInvalidRequest.WrapWithNoMessage(err))
		return
	}
	c.JSON(http.StatusOK, req)
}
