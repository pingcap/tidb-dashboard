// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package profiling

import (
	"context"
	"fmt"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
)

func skipTask(profilingType string) (string, TaskRawDataType, error) {
	return "nil", "", ErrTaskSikpped.New("task_skipped")
}

func profileAndWritePprof(ctx context.Context, fts *fetchers, target *model.RequestTargetNode, fileNameWithoutExt string, profileDurationSecs uint, profilingType TaskProfilingType) (string, TaskRawDataType, error) {
	switch target.Kind {
	case model.NodeKindTiKV:
		if string(profilingType) != string(ProfilingTypeCPU) {
			return skipTask(string(profilingType))
		}
		return fetchPprof(&pprofOptions{duration: profileDurationSecs, fileNameWithoutExt: fileNameWithoutExt, target: target, fetcher: &fts.tikv, profilingType: profilingType})
	case model.NodeKindTiFlash:
		if string(profilingType) != string(ProfilingTypeCPU) {
			return skipTask(string(profilingType))
		}
		return fetchPprof(&pprofOptions{duration: profileDurationSecs, fileNameWithoutExt: fileNameWithoutExt, target: target, fetcher: &fts.tiflash, profilingType: profilingType})
	case model.NodeKindTiDB:
		return fetchPprof(&pprofOptions{duration: profileDurationSecs, fileNameWithoutExt: fileNameWithoutExt, target: target, fetcher: &fts.tidb, profilingType: profilingType})
	case model.NodeKindPD:
		return fetchPprof(&pprofOptions{duration: profileDurationSecs, fileNameWithoutExt: fileNameWithoutExt, target: target, fetcher: &fts.pd, profilingType: profilingType})
	default:
		return "", "", fmt.Errorf("unsupported target %s", target)
	}
}
