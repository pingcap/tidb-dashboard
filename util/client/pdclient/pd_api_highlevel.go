// Copyright 2021 PingCAP, Inc.
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

// This file contains high level encapsulations over base PD APIs.

package pdclient

import (
	"sort"
	"strings"
)

func (api *APIClient) HLGetStores() ([]GetStoresResponseStore, error) {
	resp, err := api.GetStores()
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

func (api *APIClient) HLGetLocationLabels() ([]string, error) {
	resp, err := api.GetConfigReplicate()
	if err != nil {
		return nil, err
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

func (api *APIClient) HLGetStoreLocations() (*StoreLocations, error) {
	locationLabels, err := api.HLGetLocationLabels()
	if err != nil {
		return nil, err
	}

	stores, err := api.HLGetStores()
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
