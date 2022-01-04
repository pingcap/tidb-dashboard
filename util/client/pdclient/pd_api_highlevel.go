// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

// This file contains high level encapsulations over base PD APIs.

package pdclient

import (
	"context"
	"sort"
	"strings"
)

// HLGetStores returns all stores in PD in order.
// An optional ctx can be passed in to override the default context. To keep the default context, pass nil.
func (api *APIClient) HLGetStores(ctx context.Context) ([]GetStoresResponseStore, error) {
	resp, err := api.GetStores(ctx)
	if err != nil {
		return nil, err
	}
	stores := make([]GetStoresResponseStore, 0, len(resp.Stores))
	for _, s := range resp.Stores {
		stores = append(stores, s.Store)
	}
	sort.Slice(stores, func(i, j int) bool {
		return stores[i].Address < stores[j].Address
	})
	return stores, nil
}

// HLGetLocationLabels returns the location label config in PD.
// An optional ctx can be passed in to override the default context. To keep the default context, pass nil.
func (api *APIClient) HLGetLocationLabels(ctx context.Context) ([]string, error) {
	resp, err := api.GetConfigReplicate(ctx)
	if err != nil {
		return nil, err
	}
	if len(resp.LocationLabels) == 0 {
		return []string{}, nil
	}
	labels := strings.Split(resp.LocationLabels, ",")
	return labels, nil
}

type StoreLabels struct {
	Address string            `json:"address"`
	Labels  map[string]string `json:"labels"`
}

type StoreLocations struct {
	LocationLabels []string      `json:"location_labels"`
	Stores         []StoreLabels `json:"stores"`
}

func (api *APIClient) HLGetStoreLocations(ctx context.Context) (*StoreLocations, error) {
	locationLabels, err := api.HLGetLocationLabels(ctx)
	if err != nil {
		return nil, err
	}

	stores, err := api.HLGetStores(ctx)
	if err != nil {
		return nil, err
	}

	nodes := make([]StoreLabels, 0, len(stores))
	for _, s := range stores {
		node := StoreLabels{
			Address: s.Address,
			Labels:  map[string]string{},
		}
		for _, l := range s.Labels {
			node.Labels[l.Key] = l.Value
		}
		nodes = append(nodes, node)
	}

	return &StoreLocations{
		LocationLabels: locationLabels,
		Stores:         nodes,
	}, nil
}
