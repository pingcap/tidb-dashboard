// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package keyvisual

import (
	"context"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/pingcap/log"
	"go.uber.org/fx"
	"go.uber.org/zap"

	"github.com/pingcap/tidb-dashboard/pkg/config"
	"github.com/pingcap/tidb-dashboard/util/rest"
)

func (s *Service) managerHook() fx.Hook {
	var wg sync.WaitGroup
	return fx.Hook{
		OnStart: func(ctx context.Context) error {
			wg.Add(1)
			go func() {
				defer wg.Done()
				s.managerLoop(ctx)
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
		case cfg, ok := <-ch:
			if !ok {
				s.stopService()
				return
			}
			s.resetKeyVisualConfig(ctx, cfg)
		}
	}
}

func (s *Service) resetKeyVisualConfig(ctx context.Context, cfg *config.DynamicConfig) {
	if !cfg.KeyVisual.AutoCollectionDisabled {
		if s.keyVisualCfg != nil && s.keyVisualCfg.Policy != cfg.KeyVisual.Policy {
			s.stopService()
		}
		s.reloadKeyVisualConfig(&cfg.KeyVisual)
		s.startService(ctx)
	} else {
		s.stopService()
		s.reloadKeyVisualConfig(&cfg.KeyVisual)
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
// @Success 200 {object} config.KeyVisualConfig
// @Router /keyvisual/config [get]
// @Security JwtAuth
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
func (s *Service) getDynamicConfig(c *gin.Context) {
	dc, err := s.cfgManager.Get()
	if err != nil {
		rest.Error(c, err)
		return
	}
	c.JSON(http.StatusOK, dc.KeyVisual)
}

// @Summary Set Key Visual Dynamic Config
// @Param request body config.KeyVisualConfig true "Request body"
// @Success 200 {object} config.KeyVisualConfig
// @Router /keyvisual/config [put]
// @Security JwtAuth
// @Failure 400 {object} rest.ErrorResponse
// @Failure 401 {object} rest.ErrorResponse
// @Failure 500 {object} rest.ErrorResponse
func (s *Service) setDynamicConfig(c *gin.Context) {
	var req config.KeyVisualConfig
	if err := c.ShouldBindJSON(&req); err != nil {
		rest.Error(c, rest.ErrBadRequest.NewWithNoMessage())
		return
	}
	var opt config.DynamicConfigOption = func(dc *config.DynamicConfig) {
		dc.KeyVisual = req
	}
	if err := s.cfgManager.Modify(opt); err != nil {
		rest.Error(c, err)
		return
	}
	c.JSON(http.StatusOK, req)
}
