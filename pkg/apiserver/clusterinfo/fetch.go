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

package clusterinfo

import (
	"context"
	"encoding/json"
	"io/ioutil"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/pingcap/log"

	"github.com/pkg/errors"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/utils/clusterinfo"
)

// Fetcher is an interface for concurrently fetch data and store it in `info`.
type fetcher interface {
	// Fetch fetches the data, and if any unrecoverable error exists, it will return error.
	fetch(ctx context.Context, info *ClusterInfo, service *Service) error
}

// etcdFetcher fetches etcd, and parses the ns below:
// * /topology/grafana
// * /topology/alertmanager
// * /topology/tidb
type etcdFetcher struct{}

func (f etcdFetcher) fetch(ctx context.Context, info *ClusterInfo, service *Service) error {
	tidb, grafana, alertManager, err := clusterinfo.FetchEtcd(ctx, service.etcdCli)
	if err != nil {
		return err
	}
	info.TiDB = tidb
	info.Grafana = grafana
	info.AlertManager = alertManager
	return nil
}

// PDFetcher using the http to fetch PDMember information from pd endpoint.
type pdFetcher struct {
}

func (P pdFetcher) fetch(ctx context.Context, info *ClusterInfo, service *Service) error {
	resp, err := http.Get(service.config.PDEndPoint + "/pd/api/v1/members")
	if err != nil {
		return err
	}
	if resp.StatusCode != 200 {
		return errors.New("fetch-failed")
	}
	data, err := ioutil.ReadAll(resp.Body)

	if err != nil {
		return err
	}

	ds := struct {
		Count   int `json:"count"`
		Members []struct {
			ClientUrls    []string `json:"client_urls"`
			DeployPath    string   `json:"deploy_path"`
			BinaryVersion string   `json:"binary_version"`
		} `json:"members"`
	}{}

	err = json.Unmarshal(data, &ds)
	if err != nil {
		return err
	}
	for _, ds := range ds.Members {
		u, err := url.Parse(ds.ClientUrls[0])
		if err != nil {
			return err
		}

		info.Pd = append(info.Pd, clusterinfo.PD{
			DeployCommon: clusterinfo.DeployCommon{
				IP:         u.Hostname(),
				Port:       parsePort(u.Port()),
				BinaryPath: ds.DeployPath,
			},
			Version:      ds.BinaryVersion,
			ServerStatus: clusterinfo.Unknown,
		})
	}
	return nil
}

// TiKVFetcher using the PDClient to fetch tikv(store) information from pd endpoint.
type tikvFetcher struct {
}

func (t tikvFetcher) fetch(ctx context.Context, info *ClusterInfo, service *Service) error {
	stores, err := service.pdCli.GetAllStores(ctx)
	if err != nil {
		return err
	}
	for _, v := range stores {
		// parse ip and port
		addresses := strings.Split(v.Address, ":")
		port := parsePort(addresses[1])
		// Note: if no err exists, it just return 0.
		statusPort, _ := parsePortFromAddress(v.StatusAddress)
		currentInfo := clusterinfo.TiKV{
			ServerVersionInfo: clusterinfo.ServerVersionInfo{
				Version: v.Version,
				GitHash: v.GitHash,
			},
			DeployCommon: clusterinfo.DeployCommon{
				IP:         addresses[0],
				Port:       port,
				BinaryPath: v.BinaryPath,
			},
			ServerStatus: clusterinfo.Unknown,
			StatusPort:   statusPort,
			Labels:       map[string]string{},
		}
		for _, v := range v.Labels {
			currentInfo.Labels[v.Key] = currentInfo.Labels[v.Value]
		}
		info.TiKV = append(info.TiKV, currentInfo)
	}
	return nil
}

func parsePortFromAddress(address string) (uint, error) {
	var statusPort uint64
	u, err := url.Parse(address)
	// https://github.com/golang/go/issues/18824
	if err != nil {
		if strings.HasPrefix(address, "//") {
			log.Warn(err.Error())
			return 0, err
		}
		return parsePortFromAddress("//" + address)
	}
	statusPort, err = strconv.ParseUint(u.Port(), 10, 32)
	if err != nil {
		log.Warn(err.Error())
		return 0, err
	}
	return uint(statusPort), nil
}

func parsePort(port string) uint {
	var statusPort uint64
	var err error
	if statusPort, err = strconv.ParseUint(port, 10, 32); err != nil {
		log.Warn(err.Error())
		return 0
	}
	return uint(statusPort)
}
