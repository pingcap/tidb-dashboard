// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package profiling

import (
	"bytes"
	"sync"
	"time"

	"github.com/pingcap/log"
	"go.uber.org/zap"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/profiling/profutil"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/profiling/view"
	"github.com/pingcap/tidb-dashboard/util/topo"
)

// profileTask is associated with a profiling record. It is the in-memory representation of the record with some
// state managements.
type profileTask struct {
	*ProfileEntity
	model        *StandardModelImpl
	bundleEntity *BundleEntity
}

func (t *profileTask) run() {
	log.Info("profileTask.run", zap.Uint("id", t.ID))
	defer func() {
		log.Info("profileTask.runFinish", zap.Uint("id", t.ID))
	}()

	client := t.model.HTTPClientBundle.GetHTTPClientByComponentKind(t.Target.Kind)
	if client == nil {
		// We cannot send request to this component kind
		t.State = view.ProfileStateSkipped
		t.model.LocalStore.Save(t.ProfileEntity)
		return
	}

	config := profutil.Config{
		Context:       t.model.ctx,
		ProfilingKind: t.Kind,
		Client:        client,
		Target:        t.Target,
		DurationSec:   t.bundleEntity.DurationSec,
	}
	if !profutil.IsProfSupported(config) {
		t.State = view.ProfileStateSkipped
		t.model.LocalStore.Save(t.ProfileEntity)
		return
	}

	memBuf := bytes.Buffer{}
	dataType, err := profutil.FetchProfile(config, &memBuf)
	if err != nil {
		t.State = view.ProfileStateError
		t.Error = err.Error()
		t.model.LocalStore.Save(t.ProfileEntity)
		return
	}

	t.RawData = memBuf.Bytes()
	t.RawDataType = dataType
	t.State = view.ProfileStateSucceeded
	t.model.LocalStore.Save(t.ProfileEntity)
}

func (bundleTask *bundleTask) newProfileTask(now time.Time, target topo.CompDescriptor, profKind profutil.ProfKind) *profileTask {
	return &profileTask{
		ProfileEntity: &ProfileEntity{
			BundleID:      bundleTask.ID,
			State:         view.ProfileStateRunning,
			Target:        target,
			Kind:          profKind,
			StartAt:       now.Unix(),
			EstimateEndAt: now.Unix() + int64(bundleTask.DurationSec),
			RawDataType:   profutil.ProfDataTypeUnknown,
		},
		model:        bundleTask.model,
		bundleEntity: bundleTask.BundleEntity,
	}
}

// bundleTask is associated with a bundle record.
type bundleTask struct {
	*BundleEntity
	model *StandardModelImpl
}

func (model *StandardModelImpl) createAndRunBundle(
	durationSec uint,
	targets []topo.CompDescriptor,
	profilingKinds []profutil.ProfKind) (*bundleTask, error) {
	log.Info("createAndRunBundle")
	defer func() {
		log.Info("createAndRunBundle Finish")
	}()

	now := time.Now()

	bundleTask := &bundleTask{
		BundleEntity: &BundleEntity{
			State:        view.BundleStateRunning,
			DurationSec:  durationSec,
			TargetsCount: topo.CountComponents(targets),
			StartAt:      now.Unix(),
			Kinds:        profilingKinds,
		},
		model: model,
	}

	if err := model.LocalStore.Create(bundleTask.BundleEntity).Error; err != nil {
		return nil, err
	}

	profileTasks := make([]*profileTask, 0, len(targets))
	for _, target := range targets {
		for _, profilingKind := range profilingKinds {
			profileTask := bundleTask.newProfileTask(now, target, profilingKind)
			model.LocalStore.Create(profileTask.ProfileEntity)
			profileTasks = append(profileTasks, profileTask)
		}
	}

	model.bundleTaskWg.Add(1)
	go func() {
		log.Info("createAndRunBundle async goroutine")
		defer model.bundleTaskWg.Done()

		var taskTg sync.WaitGroup
		for i := 0; i < len(profileTasks); i++ {
			taskTg.Add(1)
			go func(idx int) {
				defer taskTg.Done()
				profileTasks[idx].run()
			}(i)
		}
		taskTg.Wait()

		errorTasks := 0
		finishedTasks := 0
		for _, profileTask := range profileTasks {
			if profileTask.State == view.ProfileStateError {
				errorTasks++
			} else if profileTask.State == view.ProfileStateSkipped || profileTask.State == view.ProfileStateSucceeded {
				finishedTasks++
			}
		}
		if errorTasks > 0 {
			if finishedTasks > 0 {
				bundleTask.State = view.BundleStatePartialSucceeded
			} else {
				bundleTask.State = view.BundleStateAllFailed
			}
		} else {
			bundleTask.State = view.BundleStateAllSucceeded
		}
		model.LocalStore.Save(bundleTask.BundleEntity)
	}()

	return bundleTask, nil
}
