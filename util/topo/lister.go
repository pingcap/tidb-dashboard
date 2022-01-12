// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package topo

import (
	"context"
)

// InfoLister produces a list of component infos.
type InfoLister interface {
	// List lists components infos.
	// It may be possible that there are both results and errors.
	List(context.Context) ([]CompInfo, error)
}

//go:generate mockery --name InfoLister --inpackage
var _ InfoLister = (*MockInfoLister)(nil)
