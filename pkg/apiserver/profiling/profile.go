// Copyright 2023 PingCAP, Inc. Licensed under Apache-2.0.

package profiling

import (
	"context"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
)

func profileAndWritePprof(ctx context.Context, fts *fetchers, target *model.RequestTargetNode, fileNameWithoutExt string, profileDurationSecs uint, profilingType TaskProfilingType) (string, TaskRawDataType, error) {
	switch target.Kind {
	case model.NodeKindTiKV:
		// TiKV only supports CPU/heap Profiling
		if profilingType != ProfilingTypeCPU && profilingType != ProfilingTypeHeap {
			return "", "", ErrUnsupportedProfilingType.NewWithNoMessage()
		}
		return fetchPprof(&pprofOptions{duration: profileDurationSecs, fileNameWithoutExt: fileNameWithoutExt, target: target, fetcher: &fts.tikv, profilingType: profilingType})
	case model.NodeKindTiFlash:
		// TiFlash only supports CPU Profiling
		if profilingType != ProfilingTypeCPU {
			return "", "", ErrUnsupportedProfilingType.NewWithNoMessage()
		}
		return fetchPprof(&pprofOptions{duration: profileDurationSecs, fileNameWithoutExt: fileNameWithoutExt, target: target, fetcher: &fts.tiflash, profilingType: profilingType})
	case model.NodeKindTiDB:
		return fetchPprof(&pprofOptions{duration: profileDurationSecs, fileNameWithoutExt: fileNameWithoutExt, target: target, fetcher: &fts.tidb, profilingType: profilingType})
	case model.NodeKindPD:
		return fetchPprof(&pprofOptions{duration: profileDurationSecs, fileNameWithoutExt: fileNameWithoutExt, target: target, fetcher: &fts.pd, profilingType: profilingType})
	default:
		return "", "", ErrUnsupportedProfilingTarget.New(target.String())
	}
}
