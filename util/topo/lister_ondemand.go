// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package topo

import (
	"context"
)

// OnDemandInfoLister produces the most recent component list as requested
// according to a topology provider.
type OnDemandInfoLister struct {
	provider  TopologyProvider
	listKinds []Kind
}

var _ InfoLister = &OnDemandInfoLister{}

func NewOnDemandLister(
	provider TopologyProvider,
	listKinds ...Kind) *OnDemandInfoLister {
	return &OnDemandInfoLister{
		provider:  provider,
		listKinds: listKinds,
	}
}

func (l *OnDemandInfoLister) List(ctx context.Context) ([]CompInfo, error) {
	// TODO: use goroutine to fetch components concurrently
	result := make([]CompInfo, 0, len(l.listKinds))
	for _, c := range l.listKinds {
		infoList, err := GetInfoByKind(ctx, l.provider, c)
		if err != nil {
			return nil, err
		}
		result = append(result, infoList...)
	}
	return result, nil
}
