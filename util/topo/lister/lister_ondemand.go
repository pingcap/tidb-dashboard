// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package lister

import (
	"context"

	"github.com/pingcap/tidb-dashboard/util/topo"
)

// OnDemand produces the most recent component list as requested according to a topology provider.
type OnDemand struct {
	Signer
	provider       topo.TopologyProvider
	listComponents []topo.ComponentKind
}

var _ ComponentLister = &OnDemand{}

func NewOnDemandLister(
	provider topo.TopologyProvider,
	signer Signer,
	components ...topo.ComponentKind) *OnDemand {
	return &OnDemand{
		Signer:         signer,
		provider:       provider,
		listComponents: components,
	}
}

func (l *OnDemand) List(ctx context.Context) ([]SignedComponentDescriptor, error) {
	// TODO: use goroutine to fetch components concurrently
	result := make([]SignedComponentDescriptor, 0, len(l.listComponents))
	for _, c := range l.listComponents {
		descriptors, err := topo.GetDescriptorByKind(l.provider, ctx, c)
		if err != nil {
			return nil, err
		}
		for _, d := range descriptors {
			signed, err := l.Sign(d)
			if err != nil {
				return nil, err
			}
			result = append(result, signed)
		}
	}
	return result, nil
}
