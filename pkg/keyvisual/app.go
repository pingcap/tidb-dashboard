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

type App struct {
	app    *fx.App
	status *utils.AppStatus

	ctx    context.Context
	cancel context.CancelFunc

	config     *config.Config
	provider   *region.PDDataProvider
	httpClient *http.Client

	service *Service
}

func NewApp(cfg *config.Config, provider *region.PDDataProvider, httpClient *http.Client) *App {
	return &App{
		status:     utils.NewAppStatus(),
		config:     cfg,
		provider:   provider,
		httpClient: httpClient,
	}
}

func (a *App) Start(ctx context.Context) error {
	a.ctx, a.cancel = context.WithCancel(ctx)
	a.app = fx.New(
		fx.Logger(utils.NewFxPrinter()),
		fx.Provide(
			a.NewWaitGroup,
			a.Parameters,
			input.NewStatInput,
			decorator.TiDBLabelStrategy,
			a.DistanceStrategy,
			a.NewStat,
			a.NewService,
		),
		fx.Populate(&a.service),
	)
	if err := a.app.Err(); err != nil {
		return err
	}
	if err := a.app.Start(a.ctx); err != nil {
		return err
	}
	return nil
}

func (a *App) Stop(ctx context.Context) error {
	err := a.app.Stop(ctx)
	a.service = nil
	return err
}

func (a *App) Register(r *gin.RouterGroup, auth *user.AuthService) {
	endpoint := r.Group("/keyvisual")
	endpoint.Use(a.status.MWHandleStopped(stoppedHandler))
	endpoint.Use(auth.MWAuthRequired())
	endpoint.GET("/heatmaps", func(c *gin.Context) {
		a.service.heatmapsHandler(c)
	})
}

func (a *App) NewWaitGroup(lc fx.Lifecycle) *sync.WaitGroup {
	wg := &sync.WaitGroup{}
	lc.Append(fx.Hook{
		OnStop: func(ctx context.Context) error {
			wg.Wait()
			return nil
		},
	})
	return wg
}

func (a *App) Parameters() (*config.Config, *region.PDDataProvider, *http.Client) {
	return a.config, a.provider, a.httpClient
}

func (a *App) DistanceStrategy(lc fx.Lifecycle, wg *sync.WaitGroup, labelStrategy decorator.LabelStrategy) matrix.Strategy {
	return matrix.DistanceStrategy(lc, wg, labelStrategy, distanceStrategyRatio, distanceStrategyLevel, distanceStrategyCount)
}

func (a *App) NewStat(lc fx.Lifecycle, wg *sync.WaitGroup, provider *region.PDDataProvider, in input.StatInput, strategy matrix.Strategy) *storage.Stat {
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

func (a *App) NewService(lc fx.Lifecycle, wg *sync.WaitGroup, stat *storage.Stat, strategy matrix.Strategy) *Service {
	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			a.status.Start()
			return nil
		},
		OnStop: func(ctx context.Context) error {
			a.status.Stop()
			a.cancel()
			return nil
		},
	})

	return &Service{
		maxDisplayY: heatmapsMaxDisplayY,
		stat:        stat,
		strategy:    strategy,
	}
}

func stoppedHandler(c *gin.Context) {
	_ = c.AbortWithError(http.StatusNotFound, ErrServiceStopped.NewWithNoMessage())
}
