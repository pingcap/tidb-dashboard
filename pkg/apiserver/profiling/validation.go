// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package profiling

import "github.com/pingcap/tidb-dashboard/pkg/apiserver/model"

func validateTargets(targets []model.RequestTargetNode) error {
	for i, target := range targets {
		if err := target.Validate(); err != nil {
			return ErrInvalidTarget.Wrap(err, "target %d is invalid", i)
		}
	}
	return nil
}
