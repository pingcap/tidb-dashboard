// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

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
	"github.com/joomcode/errorx"
	"github.com/pingcap/log"
	clientv3 "go.etcd.io/etcd/client/v3"
	"go.uber.org/fx"
	"go.uber.org/zap"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/pkg/config"
	"github.com/pingcap/tidb-dashboard/pkg/dbstore"
	"github.com/pingcap/tidb-dashboard/pkg/keyvisual/decorator"
	"github.com/pingcap/tidb-dashboard/pkg/keyvisual/input"
	"github.com/pingcap/tidb-dashboard/pkg/keyvisual/matrix"
	"github.com/pingcap/tidb-dashboard/pkg/keyvisual/region"
	"github.com/pingcap/tidb-dashboard/pkg/keyvisual/storage"
	"github.com/pingcap/tidb-dashboard/pkg/pd"
	"github.com/pingcap/tidb-dashboard/pkg/tidb"
	"github.com/pingcap/tidb-dashboard/pkg/utils"
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

	config         *config.Config
	keyVisualCfg   *config.KeyVisualConfig
	cfgManager     *config.DynamicConfigManager
	customProvider *region.DataProvider
	etcdClient     *clientv3.Client
	pdClient       *pd.Client
	db             *dbstore.DB
	tidbClient     *tidb.Client

	stat          *storage.Stat
	strategy      *matrix.Strategy
	labelStrategy decorator.LabelStrategy
}

// FIXME: Simplify these things.
func NewService(
	lc fx.Lifecycle,
	cfg *config.Config,
	cfgManager *config.DynamicConfigManager,
	customProvider *region.DataProvider,
	etcdClient *clientv3.Client,
	pdClient *pd.Client,
	db *dbstore.DB,
	tidbClient *tidb.Client,
) *Service {
	s := &Service{
		status:         utils.NewServiceStatus(),
		config:         cfg,
		cfgManager:     cfgManager,
		customProvider: customProvider,
		etcdClient:     etcdClient,
		pdClient:       pdClient,
		db:             db,
		tidbClient:     tidbClient,
	}

	lc.Append(s.managerHook())

	return s
}

func RegisterRouter(r *gin.RouterGroup, auth *user.AuthService, s *Service) {
	endpoint := r.Group("/keyvisual")
	endpoint.Use(auth.MWAuthRequired())

	endpoint.GET("/config", s.getDynamicConfig)
	endpoint.PUT("/config", auth.MWRequireWritePriv(), s.setDynamicConfig)

	endpoint.Use(s.status.MWHandleStopped(stoppedHandler))
	endpoint.GET("/heatmaps", s.heatmaps)
}

func (s *Service) IsRunning() bool {
	return s.status.IsRunning()
}

func (s *Service) Start(ctx context.Context) error {
	if s.IsRunning() {
		return nil
	}

	s.ctx, s.cancel = context.WithCancel(ctx)

	s.app = fx.New(
		fx.Logger(utils.NewFxPrinter()),
		fx.Provide(
			newWaitGroup,
			newStrategy,
			newStat,
			s.provideLocals,
			s.newProvider,
			input.NewStatInput,
			s.newLabelStrategy,
		),
		fx.Populate(&s.stat, &s.strategy, &s.labelStrategy),
		fx.Invoke(
			// Must be at the end
			s.status.Register,
		),
	)

	if err := s.app.Start(s.ctx); err != nil {
		s.cleanAfterError()
		return err
	}

	return nil
}

func (s *Service) newLabelStrategy(
	lc fx.Lifecycle,
	wg *sync.WaitGroup,
	etcdClient *clientv3.Client,
	tidbClient *tidb.Client,
) decorator.LabelStrategy {
	switch s.keyVisualCfg.Policy {
	case config.KeyVisualDBPolicy:
		log.Debug("New LabelStrategy", zap.String("policy", s.keyVisualCfg.Policy))
		return decorator.TiDBLabelStrategy(lc, wg, etcdClient, tidbClient)
	case config.KeyVisualKVPolicy:
		log.Debug("New LabelStrategy", zap.String("policy", s.keyVisualCfg.Policy),
			zap.String("separator", s.keyVisualCfg.PolicyKVSeparator))
		return decorator.SeparatorLabelStrategy(s.keyVisualCfg)
	default:
		panic("unreachable")
	}
}

func (s *Service) newProvider(pdClient *pd.Client) *region.DataProvider {
	if s.customProvider != nil {
		return s.customProvider
	}
	return &region.DataProvider{
		PeriodicGetter: input.NewAPIPeriodicGetter(pdClient),
	}
}

func (s *Service) reloadKeyVisualConfig(cfg *config.KeyVisualConfig) {
	s.keyVisualCfg = cfg
	if s.labelStrategy != nil {
		s.labelStrategy.ReloadConfig(s.keyVisualCfg)
	}
}

func (s *Service) cleanAfterError() {
	s.cancel()

	// drop
	s.app = nil
	s.stat = nil
	s.strategy = nil
	s.labelStrategy = nil
	s.ctx = nil
	s.cancel = nil
}

func (s *Service) Stop(ctx context.Context) error {
	if !s.IsRunning() || s.app == nil {
		return nil
	}

	s.cancel()
	err := s.app.Stop(ctx)

	// drop
	s.app = nil
	s.stat = nil
	s.strategy = nil
	s.labelStrategy = nil
	s.ctx = nil
	s.cancel = nil

	return err
}

// @Summary Key Visual Heatmaps
// @Description Heatmaps in a given range to visualize TiKV usage
// @Param startkey query string false "The start of the key range"
// @Param endkey query string false "The end of the key range"
// @Param starttime query int false "The start of the time range (Unix)"
// @Param endtime query int false "The end of the time range (Unix)"
// @Param type query string false "Main types of data" Enums(written_bytes, read_bytes, written_keys, read_keys, integration)
// @Success 200 {object} matrix.Matrix
// @Router /keyvisual/heatmaps [get]
// @Security JwtAuth
// @Failure 401 {object} rest.ErrorResponse
func (s *Service) heatmaps(c *gin.Context) {
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
	resp := plane.Pixel(s.strategy, heatmapsMaxDisplayY, region.GetDisplayTags(baseTag))
	resp.Range(startKey, endKey)
	// TODO: An expedient to reduce data transmission, which needs to be deleted later.
	resp.DataMap = map[string][][]uint64{
		typ: resp.DataMap[typ],
	}
	// ----------
	c.JSON(http.StatusOK, resp)
}

func (s *Service) provideLocals() (*config.Config, *clientv3.Client, *pd.Client, *dbstore.DB, *tidb.Client) {
	return s.config, s.etcdClient, s.pdClient, s.db, s.tidbClient
}

func newWaitGroup(lc fx.Lifecycle) *sync.WaitGroup {
	wg := &sync.WaitGroup{}
	lc.Append(fx.Hook{
		OnStop: func(_ context.Context) error {
			wg.Wait()
			return nil
		},
	})
	return wg
}

func newStrategy(lc fx.Lifecycle, wg *sync.WaitGroup, labelStrategy decorator.LabelStrategy) *matrix.Strategy {
	return &matrix.Strategy{
		LabelStrategy: labelStrategy,
		SplitStrategy: matrix.DistanceSplitStrategy(
			lc, wg,
			distanceStrategyRatio,
			distanceStrategyLevel,
			distanceStrategyCount,
		),
	}
}

func newStat(
	lc fx.Lifecycle,
	wg *sync.WaitGroup,
	_ *clientv3.Client,
	db *dbstore.DB,
	in input.StatInput,
	strategy *matrix.Strategy,
) *storage.Stat {
	stat := storage.NewStat(lc, wg, db, defaultStatConfig, strategy, in.GetStartTime())

	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			wg.Add(1)
			go func() {
				defer wg.Done()
				in.Background(ctx, stat)
			}()
			return nil
		},
	})

	return stat
}

func stoppedHandler(c *gin.Context) {
	_ = c.AbortWithError(http.StatusNotFound, ErrServiceStopped.NewWithNoMessage())
}
