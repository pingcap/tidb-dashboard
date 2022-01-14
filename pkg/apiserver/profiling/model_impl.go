// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package profiling

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/fx"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/profiling/view"
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
	CompSigner   topo.CompDescriptorSigner
	TopoProvider topo.TopologyProvider
}

type StandardModelImpl struct {
	Params
	clientbundle.HTTPClientBundle
	componentLister topo.InfoLister

	ctx          context.Context
	cancel       context.CancelFunc
	bundleTaskWg sync.WaitGroup
}

var _ view.Model = &StandardModelImpl{}

func NewStandardModelImpl(lc fx.Lifecycle, p Params, httpClients clientbundle.HTTPClientBundle) view.Model {
	model := &StandardModelImpl{
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
			// model.ctx by using the background ctx. We should switch back
			// to use OnStart ctx once it is fixed.
			model.ctx, model.cancel = context.WithCancel(context.Background())
			return nil
		},
		OnStop: func(ctx context.Context) error {
			model.cancel()
			model.bundleTaskWg.Wait()
			return nil
		},
	})
	return model
}

func (model *StandardModelImpl) AuthFn(ops ...view.Operation) []gin.HandlerFunc {
	handlers := []gin.HandlerFunc{
		model.Auth.MWAuthRequired(),
	}
	shouldCheckWrite := false
	for _, op := range ops {
		if op == view.OpStartBundle {
			shouldCheckWrite = true
			break
		}
	}
	if shouldCheckWrite {
		handlers = append(handlers, model.Auth.MWRequireWritePriv())
	}
	return handlers
}

func (model *StandardModelImpl) ListTargets() (view.ListTargetsResp, error) {
	infoList, err := model.componentLister.List(model.ctx)
	if err != nil {
		return view.ListTargetsResp{}, err
	}
	signedTargets, err := topo.BatchSignCompInfo(model.CompSigner, infoList)
	if err != nil {
		return view.ListTargetsResp{}, err
	}
	return view.ListTargetsResp{Targets: signedTargets}, nil
}

func (model *StandardModelImpl) StartBundle(req view.StartBundleReq) (view.StartBundleResp, error) {
	targets, err := topo.BatchVerifyCompDesc(model.CompSigner, req.Targets)
	if err != nil {
		return view.StartBundleResp{}, rest.ErrBadRequest.Wrap(err, "targets are not valid")
	}
	task, err := model.createAndRunBundle(req.DurationSec, targets, req.Kinds)
	if err != nil {
		return view.StartBundleResp{}, err
	}
	return view.StartBundleResp{BundleID: task.ID}, nil
}

func (model *StandardModelImpl) ListBundles() (view.ListBundlesResp, error) {
	var rows []BundleEntity
	err := model.LocalStore.
		Order("id DESC").
		Find(&rows).Error
	if err != nil {
		return view.ListBundlesResp{}, err
	}
	bundles := make([]view.Bundle, 0, len(rows))
	for _, row := range rows {
		bundles = append(bundles, row.ToViewModel())
	}
	return view.ListBundlesResp{Bundles: bundles}, nil
}

func (model *StandardModelImpl) GetBundle(req view.GetBundleReq) (view.GetBundleResp, error) {
	var bundleRow BundleEntity
	err := model.LocalStore.
		Where("id = ?", req.BundleID).
		Take(&bundleRow).Error
	if err != nil {
		return view.GetBundleResp{}, gormerr.WrapNotFound(err)
	}

	var profileRows []ProfileEntity
	err = model.LocalStore.
		Where("bundle_id = ?", req.BundleID).
		Order("id ASC").
		Find(&profileRows).Error
	if err != nil {
		return view.GetBundleResp{}, err
	}

	profiles := make([]view.Profile, 0, len(profileRows))
	now := time.Now()
	for _, row := range profileRows {
		profiles = append(profiles, row.ToViewModel(now))
	}
	return view.GetBundleResp{
		Bundle:   bundleRow.ToViewModel(),
		Profiles: profiles,
	}, nil
}

func (model *StandardModelImpl) GetProfileData(req view.GetProfileDataReq) (view.GetProfileDataResp, error) {
	var row ProfileEntity
	err := model.LocalStore.
		Where("id = ?", req.ProfileID).
		Take(&row).Error
	if err != nil {
		return view.GetProfileDataResp{}, gormerr.WrapNotFound(err)
	}
	if row.State != view.ProfileStateSucceeded {
		return view.GetProfileDataResp{}, fmt.Errorf("the profile is in %s state", row.State)
	}
	return view.GetProfileDataResp{
		Profile: view.ProfileWithData{
			Profile: row.ToViewModel(time.Now()),
			Data:    row.RawData,
		},
	}, nil
}

func (model *StandardModelImpl) GetBundleData(req view.GetBundleDataReq) (view.GetBundleDataResp, error) {
	var rows []ProfileEntity
	err := model.LocalStore.
		Where("bundle_id = ? AND state = ?", req.BundleID, view.ProfileStateSucceeded).
		Order("id ASC").
		Find(&rows).Error
	if err != nil {
		return view.GetBundleDataResp{}, err
	}
	profiles := make([]view.ProfileWithData, 0, len(rows))
	now := time.Now()
	for _, row := range rows {
		profiles = append(profiles, view.ProfileWithData{
			Profile: row.ToViewModel(now),
			Data:    row.RawData,
		})
	}
	return view.GetBundleDataResp{
		Profiles: profiles,
	}, nil
}
