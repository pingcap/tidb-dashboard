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

package configuration

//import (
//	"context"
//	"encoding/json"
//	"fmt"
//
//	"github.com/jeremywohl/flatten"
//	"go.etcd.io/etcd/clientv3"
//	"go.uber.org/fx"
//
//	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
//	"github.com/pingcap-incubator/tidb-dashboard/pkg/pd"
//	"github.com/pingcap-incubator/tidb-dashboard/pkg/tidb"
//	"github.com/pingcap-incubator/tidb-dashboard/pkg/utils/topology"
//)
//
//type ServiceParams struct {
//	fx.In
//	pdClient   *pd.Client
//	etcdClient *clientv3.Client
//	config     *config.Config
//	tidbClient *tidb.Client
//}
//
//type Service struct {
//	ServiceParams
//	lifecycleCtx context.Context
//}
//
//func NewService(lc fx.Lifecycle, p ServiceParams) *Service {
//	service := &Service{ServiceParams: p}
//	lc.Append(fx.Hook{
//		OnStart: func(ctx context.Context) error {
//			service.lifecycleCtx = ctx
//			return nil
//		},
//	})
//
//	return service
//}
//
//type ItemKind string
//
//const (
//	ItemKindTiKVConfig   ItemKind = "tikv_config"
//	ItemKindPDConfig     ItemKind = "pd_config"
//	ItemKindTiDBConfig   ItemKind = "tidb_config"
//	ItemKindTiDBVariable ItemKind = "tidb_variable"
//)
//
//type Item struct {
//	Id           string
//	Kind         string
//	IsEditable   bool
//	IsGlobal     bool
//	IsMultiValue bool   // TODO: Support per-instance config
//	SingleValue  string // Present when `IsMultiValue == false`.
//}
//
//type channelItem struct {
//	Err                  error
//	SourceDisplayAddress string
//	SourceKind           ItemKind
//	Values               map[string]interface{}
//}
//
//func processNestedConfigAPIResponse(data []byte) (map[string]interface{}, error) {
//	nestedConfig := make(map[string]interface{})
//	if err := json.Unmarshal(data, &nestedConfig); err != nil {
//		return nil, err
//	}
//
//	plainConfig, err := flatten.Flatten(nestedConfig, "", flatten.DotStyle)
//	if err != nil {
//		return nil, err
//	}
//
//	return plainConfig, nil
//}
//
//func (s *Service) getConfigItemsFromPDToChannel(pd *topology.PDInfo, ch chan<- channelItem) {
//	displayAddress := fmt.Sprintf("%s:%d", pd.IP, pd.Port)
//	baseURL := fmt.Sprintf("%s://%s", s.config.GetClusterHttpScheme(), displayAddress)
//
//	r, err := s.getConfigItemsFromPD(baseURL)
//	if err != nil {
//		ch <- channelItem{Err: err}
//		return
//	}
//	ch <- channelItem{
//		Err:                  nil,
//		SourceDisplayAddress: displayAddress,
//		SourceKind:           ItemKindPDConfig,
//		Values:               r,
//	}
//}
//
//func (s *Service) getConfigItemsFromPD(baseURL string) (map[string]interface{}, error) {
//	data, err := s.pdClient.WithBaseURL(baseURL).SendGetRequest("/config")
//	if err != nil {
//		return nil, err
//	}
//	return processNestedConfigAPIResponse(data)
//}
//
//func (s *Service) getConfigItemsFromTiDBToChannel(tidb *topology.TiDBInfo, ch chan<- channelItem) {
//	displayAddress := fmt.Sprintf("%s:%d", tidb.IP, tidb.Port)
//
//	r, err := s.getConfigItemsFromTiDB(tidb.IP, int(tidb.StatusPort))
//	if err != nil {
//		ch <- channelItem{Err: err}
//		return
//	}
//	ch <- channelItem{
//		Err:                  nil,
//		SourceDisplayAddress: displayAddress,
//		SourceKind:           ItemKindPDConfig,
//		Values:               r,
//	}
//}
//
//func (s *Service) getConfigItemsFromTiDB(host string, statusPort int) (map[string]interface{}, error) {
//	data, err := s.tidbClient.WithStatusAPIAddress(host, statusPort).SendGetRequest("/config")
//	if err != nil {
//		return nil, err
//	}
//	return processNestedConfigAPIResponse(data)
//}
//
//func (s *Service) getAllConfigItems() ([]Item, error) {
//	pdInfo, err := topology.FetchPDTopology(s.pdClient)
//	if err != nil {
//		return nil, err
//	}
//
//	tikvInfo, _, err := topology.FetchStoreTopology(s.pdClient)
//	if err != nil {
//		return nil, err
//	}
//
//	tidbInfo, err := topology.FetchTiDBTopology(s.lifecycleCtx, s.etcdClient)
//	if err != nil {
//		return nil, err
//	}
//
//	ch := make(chan channelItem)
//
//	for _, item := range pdInfo {
//		item2 := item
//		go s.getConfigItemsFromPDToChannel(&item2, ch)
//	}
//	for _, tikv := range tikvInfo {
//		go s.getConfigItemsFromTiKV()
//	}
//	for _, tidb := range tidbInfo {
//		go s.getConfigItemsFromTiDB()
//	}
//}
