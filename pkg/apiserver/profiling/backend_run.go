// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package profiling

import (
	"bytes"
	"sync"
	"time"

	"github.com/pingcap/log"
	"go.uber.org/zap"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/profiling/profutil"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/profiling/svc/model"
	"github.com/pingcap/tidb-dashboard/util/topo"
)

// profileTask is associated with a profiling record. It is the in-memory representation of the record with some
// state managements.
type profileTask struct {
	*ProfileModel
	backend     *StandardBackend
	bundleModel *BundleModel
}

func (t *profileTask) run() {
	log.Info("profileTask.run", zap.Uint("id", t.ID))
	defer func() {
		log.Info("profileTask.runFinish", zap.Uint("id", t.ID))
	}()

	client := t.backend.HTTPClientBundle.GetHTTPClientByComponentKind(t.Target.Kind)
	if client == nil {
		// We cannot send request to this component kind
		t.State = model.ProfileStateSkipped
		t.backend.LocalStore.Save(t.ProfileModel)
		return
	}

	config := profutil.Config{
		Context:       t.backend.ctx,
		ProfilingKind: t.Kind,
		Client:        client,
		Target:        t.Target,
		DurationSec:   t.bundleModel.DurationSec,
	}
	if !profutil.IsProfSupported(config) {
		t.State = model.ProfileStateSkipped
		t.backend.LocalStore.Save(t.ProfileModel)
		return
	}

	memBuf := bytes.Buffer{}
	dataType, err := profutil.FetchProfile(config, &memBuf)
	if err != nil {
		t.State = model.ProfileStateError
		t.Error = err.Error()
		t.backend.LocalStore.Save(t.ProfileModel)
		return
	}

	t.RawData = memBuf.Bytes()
	t.RawDataType = dataType
	t.State = model.ProfileStateSucceeded
	t.backend.LocalStore.Save(t.ProfileModel)
}

func (bundleTask *bundleTask) newProfileTask(now time.Time, target topo.CompDescriptor, profKind profutil.ProfKind) *profileTask {
	return &profileTask{
		ProfileModel: &ProfileModel{
			BundleID:      bundleTask.ID,
			State:         model.ProfileStateRunning,
			Target:        target,
			Kind:          profKind,
			StartAt:       now.Unix(),
			EstimateEndAt: now.Unix() + int64(bundleTask.DurationSec),
			RawDataType:   profutil.ProfDataTypeUnknown,
		},
		backend:     bundleTask.backend,
		bundleModel: bundleTask.BundleModel,
	}
}

// bundleTask is associated with a bundle record.
type bundleTask struct {
	*BundleModel
	backend *StandardBackend
}

func (backend *StandardBackend) createAndRunBundle(
	durationSec uint,
	targets []topo.CompDescriptor,
	profilingKinds []profutil.ProfKind) (*bundleTask, error) {
	log.Info("createAndRunBundle")
	defer func() {
		log.Info("createAndRunBundle Finish")
	}()

	now := time.Now()

	bundleTask := &bundleTask{
		BundleModel: &BundleModel{
			State:        model.BundleStateRunning,
			DurationSec:  durationSec,
			TargetsCount: topo.CountComponents(targets),
			StartAt:      now.Unix(),
			Kinds:        profilingKinds,
		},
		backend: backend,
	}

	if err := backend.LocalStore.Create(bundleTask.BundleModel).Error; err != nil {
		return nil, err
	}

	profileTasks := make([]*profileTask, 0, len(targets))
	for _, target := range targets {
		for _, profilingKind := range profilingKinds {
			profileTask := bundleTask.newProfileTask(now, target, profilingKind)
			backend.LocalStore.Create(profileTask.ProfileModel)
			profileTasks = append(profileTasks, profileTask)
		}
	}

	backend.bundleTaskWg.Add(1)
	go func() {
		log.Info("createAndRunBundle async goroutine")
		defer backend.bundleTaskWg.Done()

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
			if profileTask.State == model.ProfileStateError {
				errorTasks++
			} else if profileTask.State == model.ProfileStateSkipped || profileTask.State == model.ProfileStateSucceeded {
				finishedTasks++
			}
		}
		if errorTasks > 0 {
			if finishedTasks > 0 {
				bundleTask.State = model.BundleStatePartialSucceeded
			} else {
				bundleTask.State = model.BundleStateAllFailed
			}
		} else {
			bundleTask.State = model.BundleStateAllSucceeded
		}
		backend.LocalStore.Save(bundleTask.BundleModel)
	}()

	return bundleTask, nil
}
