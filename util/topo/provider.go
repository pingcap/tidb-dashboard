// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package topo

import (
	"context"
	"fmt"
)

// TopologyProvider provides the topology information for different components.
type TopologyProvider interface {
	GetPD(ctx context.Context) ([]PDInfo, error)
	GetTiDB(ctx context.Context) ([]TiDBInfo, error)
	GetTiKV(ctx context.Context) ([]TiKVStoreInfo, error)
	GetTiFlash(ctx context.Context) ([]TiFlashStoreInfo, error)
	GetPrometheus(ctx context.Context) (*PrometheusInfo, error)
	GetGrafana(ctx context.Context) (*GrafanaInfo, error)
	GetAlertManager(ctx context.Context) (*AlertManagerInfo, error)
}

func GetDescriptorByKind(p TopologyProvider, ctx context.Context, kind ComponentKind) ([]ComponentDescriptor, error) {
	switch kind {
	case KindTiDB:
		v, err := p.GetTiDB(ctx)
		if err != nil {
			return nil, err
		}
		result := make([]ComponentDescriptor, 0, len(v))
		for _, info := range v {
			result = append(result, info.Describe())
		}
		return result, nil
	case KindTiKV:
		v, err := p.GetTiKV(ctx)
		if err != nil {
			return nil, err
		}
		result := make([]ComponentDescriptor, 0, len(v))
		for _, info := range v {
			result = append(result, info.Describe())
		}
		return result, nil
	case KindPD:
		v, err := p.GetPD(ctx)
		if err != nil {
			return nil, err
		}
		result := make([]ComponentDescriptor, 0, len(v))
		for _, info := range v {
			result = append(result, info.Describe())
		}
		return result, nil
	case KindTiFlash:
		v, err := p.GetTiFlash(ctx)
		if err != nil {
			return nil, err
		}
		result := make([]ComponentDescriptor, 0, len(v))
		for _, info := range v {
			result = append(result, info.Describe())
		}
		return result, nil
	case KindAlertManager:
		v, err := p.GetAlertManager(ctx)
		if err != nil {
			return nil, err
		}
		return []ComponentDescriptor{v.Describe()}, nil
	case KindGrafana:
		v, err := p.GetGrafana(ctx)
		if err != nil {
			return nil, err
		}
		return []ComponentDescriptor{v.Describe()}, nil
	case KindPrometheus:
		v, err := p.GetPrometheus(ctx)
		if err != nil {
			return nil, err
		}
		return []ComponentDescriptor{v.Describe()}, nil
	default:
		return nil, fmt.Errorf("unsupported component %s", kind)
	}
}

//go:generate mockery --name TopologyProvider --inpackage
var _ TopologyProvider = (*MockTopologyProvider)(nil)
