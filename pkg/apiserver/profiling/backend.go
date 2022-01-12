// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package profiling

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/fx"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/profiling/svc/model"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/pkg/dbstore"
	"github.com/pingcap/tidb-dashboard/util/clientbundle"
	"github.com/pingcap/tidb-dashboard/util/gormutil/gormerr"
	"github.com/pingcap/tidb-dashboard/util/rest"
	"github.com/pingcap/tidb-dashboard/util/topo"
)

type Params struct {
	fx.In
	LocalStore   *dbstore.DB
	Auth         *user.AuthService
	CompSigner   topo.CompDescSigner
	TopoProvider topo.TopologyProvider
}

type StandardBackend struct {
	Params
	clientbundle.HTTPClientBundle
	componentLister topo.InfoLister

	ctx          context.Context
	cancel       context.CancelFunc
	bundleTaskWg sync.WaitGroup
}

var _ model.Backend = &StandardBackend{}

func NewStandardBackend(lc fx.Lifecycle, p Params, httpClients clientbundle.HTTPClientBundle) model.Backend {
	backend := &StandardBackend{
		Params:           p,
		HTTPClientBundle: httpClients,
		componentLister: topo.NewOnDemandLister(
			p.TopoProvider,
			topo.KindPD, topo.KindTiDB, topo.KindTiKV, topo.KindTiFlash),
	}
	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			if err := autoMigrate(p.LocalStore); err != nil {
				return err
			}
			// TODO: The OnStart ctx is incorrect, so that we are assigning
			// backend.ctx by using the background ctx. We should switch back
			// to use OnStart ctx once it is fixed.
			backend.ctx, backend.cancel = context.WithCancel(context.Background())
			return nil
		},
		OnStop: func(ctx context.Context) error {
			backend.cancel()
			backend.bundleTaskWg.Wait()
			return nil
		},
	})
	return backend
}

func (backend *StandardBackend) Capabilities() []model.Capability {
	return []model.Capability{
		model.CapStartNewBundle,
	}
}

func (backend *StandardBackend) AuthFn(ops ...model.Operation) []gin.HandlerFunc {
	handlers := []gin.HandlerFunc{
		backend.Auth.MWAuthRequired(),
	}
	shouldCheckWrite := false
	for _, op := range ops {
		if op == model.OpStartBundle {
			shouldCheckWrite = true
			break
		}
	}
	if shouldCheckWrite {
		handlers = append(handlers, backend.Auth.MWRequireWritePriv())
	}
	return handlers
}

func (backend *StandardBackend) ListTargets() (model.ListTargetsResp, error) {
	infoList, err := backend.componentLister.List(backend.ctx)
	if err != nil {
		return model.ListTargetsResp{}, err
	}
	signedTargets, err := topo.BatchSignCompInfo(backend.CompSigner, infoList)
	if err != nil {
		return model.ListTargetsResp{}, err
	}
	return model.ListTargetsResp{Targets: signedTargets}, nil
}

func (backend *StandardBackend) StartBundle(req model.StartBundleReq) (model.StartBundleResp, error) {
	targets, err := topo.BatchVerifyCompDesc(backend.CompSigner, req.Targets)
	if err != nil {
		return model.StartBundleResp{}, rest.ErrBadRequest.Wrap(err, "targets are not valid")
	}
	task, err := backend.createAndRunBundle(req.DurationSec, targets, req.Kinds)
	if err != nil {
		return model.StartBundleResp{}, err
	}
	return model.StartBundleResp{BundleID: task.ID}, nil
}

func (backend *StandardBackend) ListBundles() (model.ListBundlesResp, error) {
	var rows []BundleModel
	err := backend.LocalStore.
		Order("id DESC").
		Find(&rows).Error
	if err != nil {
		return model.ListBundlesResp{}, err
	}
	bundles := make([]model.Bundle, 0, len(rows))
	for _, row := range rows {
		bundles = append(bundles, row.ToStandardModel())
	}
	return model.ListBundlesResp{Bundles: bundles}, nil
}

func (backend *StandardBackend) GetBundle(req model.GetBundleReq) (model.GetBundleResp, error) {
	var bundleRow BundleModel
	err := backend.LocalStore.
		Where("id = ?", req.BundleID).
		Take(&bundleRow).Error
	if err != nil {
		return model.GetBundleResp{}, gormerr.WrapNotFound(err)
	}

	var profileRows []ProfileModel
	err = backend.LocalStore.
		Where("bundle_id = ?", req.BundleID).
		Order("id ASC").
		Find(&profileRows).Error
	if err != nil {
		return model.GetBundleResp{}, err
	}

	profiles := make([]model.Profile, 0, len(profileRows))
	now := time.Now()
	for _, row := range profileRows {
		profiles = append(profiles, row.ToStandardModel(now))
	}
	return model.GetBundleResp{
		Bundle:   bundleRow.ToStandardModel(),
		Profiles: profiles,
	}, nil
}

func (backend *StandardBackend) GetProfileData(req model.GetProfileDataReq) (model.GetProfileDataResp, error) {
	var row ProfileModel
	err := backend.LocalStore.
		Where("id = ?", req.ProfileID).
		Take(&row).Error
	if err != nil {
		return model.GetProfileDataResp{}, gormerr.WrapNotFound(err)
	}
	if row.State != model.ProfileStateSucceeded {
		return model.GetProfileDataResp{}, fmt.Errorf("the profile is in %s state", row.State)
	}
	return model.GetProfileDataResp{
		Profile: model.ProfileWithData{
			Profile: row.ToStandardModel(time.Now()),
			Data:    row.RawData,
		},
	}, nil
}

func (backend *StandardBackend) GetBundleData(req model.GetBundleDataReq) (model.GetBundleDataResp, error) {
	var rows []ProfileModel
	err := backend.LocalStore.
		Where("bundle_id = ? AND state = ?", req.BundleID, model.ProfileStateSucceeded).
		Order("id ASC").
		Find(&rows).Error
	if err != nil {
		return model.GetBundleDataResp{}, err
	}
	profiles := make([]model.ProfileWithData, 0, len(rows))
	now := time.Now()
	for _, row := range rows {
		profiles = append(profiles, model.ProfileWithData{
			Profile: row.ToStandardModel(now),
			Data:    row.RawData,
		})
	}
	return model.GetBundleDataResp{
		Profiles: profiles,
	}, nil
}
