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

package profiling

import (
	"context"
	"flag"
	"fmt"
	"sync"
	"time"

	"github.com/google/pprof/driver"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
)

var (
	_  driver.Fetcher = (*fetcher)(nil)
	mu sync.Mutex
)

type flagSet struct {
	*flag.FlagSet
	args []string
}

const (
	maxProfilingTimeout = time.Minute * 5
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
