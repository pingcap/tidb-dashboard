// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package profiling

import (
	"context"
	"fmt"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
)

func profileAndWriteSVG(ctx context.Context, fts *fetchers, target *model.RequestTargetNode, fileNameWithoutExt string, profileDurationSecs uint) (string, error) {
	switch target.Kind {
	case model.NodeKindTiKV:
		return fetchFlameGraphSVG(&flameGraphOptions{duration: profileDurationSecs, fileNameWithoutExt: fileNameWithoutExt, target: target, fetcher: &fts.tikv})
	case model.NodeKindTiFlash:
		return fetchFlameGraphSVG(&flameGraphOptions{duration: profileDurationSecs, fileNameWithoutExt: fileNameWithoutExt, target: target, fetcher: &fts.tiflash})
	case model.NodeKindTiDB:
		return fetchPprofSVG(&pprofOptions{duration: profileDurationSecs, fileNameWithoutExt: fileNameWithoutExt, target: target, fetcher: &fts.tidb})
	case model.NodeKindPD:
		return fetchPprofSVG(&pprofOptions{duration: profileDurationSecs, fileNameWithoutExt: fileNameWithoutExt, target: target, fetcher: &fts.pd})
	default:
		return "", fmt.Errorf("unsupported target %s", target)
	}
}
