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
	"fmt"
	"time"

	"github.com/goccy/go-graphviz"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/profiling/fetcher"
)

func profileAndWriteSVG(ctx context.Context, cm *fetcher.ClientMap, target *model.RequestTargetNode, fileNameWithoutExt string, profileDurationSecs uint) (string, error) {
	c, err := cm.Get(target.Kind)
	if err != nil {
		return "", err
	}

	var p *profiler

	switch target.Kind {
	case model.NodeKindTiKV, model.NodeKindTiFlash:
		p = &profiler{
			Fetcher: &fetcher.FlameGraph{
				Client: c,
				Target: target,
			},
			Writer: &fileWriter{fileNameWithoutExt: fileNameWithoutExt, ext: "svg"},
		}
	case model.NodeKindTiDB, model.NodeKindPD:
		p = &profiler{
			Fetcher: &fetcher.Pprof{
				Client:             c,
				Target:             target,
				FileNameWithoutExt: fileNameWithoutExt,
			},
			Writer: &graphvizSVGWriter{fileNameWithoutExt: fileNameWithoutExt, ext: graphviz.SVG},
		}
	default:
		return "", fmt.Errorf("unsupported target %s", target)
	}

	return p.Profile(&profileOptions{ProfileFetchOptions: fetcher.ProfileFetchOptions{Duration: time.Duration(profileDurationSecs)}})
}
