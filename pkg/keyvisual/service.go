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
	"math"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/joomcode/errorx"
	"go.uber.org/fx"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/dbstore"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/keyvisual/decorator"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/keyvisual/input"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/keyvisual/matrix"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/keyvisual/region"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/keyvisual/storage"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/utils"
)

const (
	heatmapsMaxDisplayY = 1536

	distanceStrategyRatio = 1.0 / math.Phi
	distanceStrategyLevel = 15
	distanceStrategyCount = 50
)

var (
	ErrNS             = errorx.NewNamespace("error.keyvisual")
	ErrServiceStopped = ErrNS.NewType("service_stopped")

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
	app    *fx.App
	status *utils.ServiceStatus

	ctx    context.Context
	cancel context.CancelFunc

	config     *config.Config
	provider   *region.PDDataProvider
	httpClient *http.Client
	db         *dbstore.DB

	core *ServiceCore
}

func NewService(lc fx.Lifecycle, cfg *config.Config, provider *region.PDDataProvider, httpClient *http.Client, db *dbstore.DB) *Service {
	s := &Service{
		status:     utils.NewServiceStatus(),
		config:     cfg,
		provider:   provider,
		httpClient: httpClient,
		db:         db,
	}

	lc.Append(fx.Hook{
		OnStart: s.StartSupportTask,
		OnStop:  s.StopSupportTask,
	})

	return s
}

func Register(r *gin.RouterGroup, auth *user.AuthService, s *Service) {
	endpoint := r.Group("/keyvisual")
	endpoint.Use(s.status.MWHandleStopped(stoppedHandler))
	endpoint.Use(auth.MWAuthRequired())
	endpoint.GET("/heatmaps", func(c *gin.Context) {
		s.core.heatmapsHandler(c)
	})
}

func (s *Service) Name() string {
	return "keyvisual"
}

func (s *Service) IsRunning() bool {
	return s.status.IsRunning()
}

func (s *Service) StartSupportTask(ctx context.Context) error {
	s.ctx, s.cancel = context.WithCancel(ctx)
	s.app = fx.New(
		fx.Logger(utils.NewFxPrinter()),
		fx.Provide(
			s.newWaitGroup,
			s.provide,
			input.NewStatInput,
			decorator.TiDBLabelStrategy,
			s.newStrategy,
			s.newStat,
			s.newServiceCore,
		),
		fx.Populate(&s.core),
	)

	if err := s.app.Err(); err != nil {
		return err
	}
	if err := s.app.Start(s.ctx); err != nil {
		return err
	}
	return nil
}

func (s *Service) StopSupportTask(ctx context.Context) error {
	err := s.app.Stop(ctx)
	s.core = nil
	return err
}

func (s *Service) newWaitGroup(lc fx.Lifecycle) *sync.WaitGroup {
	wg := &sync.WaitGroup{}
	lc.Append(fx.Hook{
		OnStop: func(ctx context.Context) error {
			wg.Wait()
			return nil
		},
	})
	return wg
}

func (s *Service) provide() (*config.Config, *region.PDDataProvider, *http.Client, *dbstore.DB) {
	return s.config, s.provider, s.httpClient, s.db
}

func (s *Service) newStrategy(lc fx.Lifecycle, wg *sync.WaitGroup, labelStrategy decorator.LabelStrategy) matrix.Strategy {
	return matrix.DistanceStrategy(lc, wg, labelStrategy, distanceStrategyRatio, distanceStrategyLevel, distanceStrategyCount)
}

func (s *Service) newStat(lc fx.Lifecycle, wg *sync.WaitGroup, provider *region.PDDataProvider, in input.StatInput, strategy matrix.Strategy) *storage.Stat {
	stat := storage.NewStat(lc, wg, provider, defaultStatConfig, strategy, in.GetStartTime())

	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			wg.Add(1)
			go func() {
				in.Background(ctx, stat)
				wg.Done()
			}()
			return nil
		},
	})

	return stat
}

func (s *Service) newServiceCore(lc fx.Lifecycle, wg *sync.WaitGroup, stat *storage.Stat, strategy matrix.Strategy) *ServiceCore {
	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			s.status.Start()
			return nil
		},
		OnStop: func(ctx context.Context) error {
			s.status.Stop()
			s.cancel()
			return nil
		},
	})

	return &ServiceCore{
		maxDisplayY: heatmapsMaxDisplayY,
		stat:        stat,
		strategy:    strategy,
	}
}

func stoppedHandler(c *gin.Context) {
	_ = c.AbortWithError(http.StatusNotFound, ErrServiceStopped.NewWithNoMessage())
}
