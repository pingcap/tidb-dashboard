// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package configuration

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net"
	"sort"
	"strconv"

	"github.com/joomcode/errorx"
	clientv3 "go.etcd.io/etcd/client/v3"
	"go.uber.org/fx"
	"gorm.io/gorm"

	"github.com/pingcap/tidb-dashboard/pkg/config"
	"github.com/pingcap/tidb-dashboard/pkg/pd"
	"github.com/pingcap/tidb-dashboard/pkg/tidb"
	"github.com/pingcap/tidb-dashboard/pkg/tikv"
	"github.com/pingcap/tidb-dashboard/pkg/utils/topology"
	"github.com/pingcap/tidb-dashboard/util/distro"
	"github.com/pingcap/tidb-dashboard/util/rest"
)

var (
	ErrNS                    = errorx.NewNamespace("error.api.config")
	ErrListTopologyFailed    = ErrNS.NewType("list_topology_failed")
	ErrListConfigItemsFailed = ErrNS.NewType("list_config_items_failed")
	ErrNotEditable           = ErrNS.NewType("not_editable")
	ErrEditFailed            = ErrNS.NewType("edit_failed")
)

type ServiceParams struct {
	fx.In
	Config     *config.Config
	PDClient   *pd.Client
	EtcdClient *clientv3.Client
	TiDBClient *tidb.Client
	TiKVClient *tikv.Client
}

type Service struct {
	params       ServiceParams
	lifecycleCtx context.Context
}

func NewService(lc fx.Lifecycle, p ServiceParams) *Service {
	service := &Service{params: p}
	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			service.lifecycleCtx = ctx
			return nil
		},
	})

	return service
}

type ItemKind string

const (
	ItemKindTiKVConfig   ItemKind = "tikv_config"
	ItemKindPDConfig     ItemKind = "pd_config"
	ItemKindTiDBConfig   ItemKind = "tidb_config"
	ItemKindTiDBVariable ItemKind = "tidb_variable"
)

type channelItem struct {
	Err                  error
	SourceDisplayAddress string
	SourceKind           ItemKind
	Values               map[string]interface{}
}

func processNestedConfigAPIResponse(data []byte) (map[string]interface{}, error) {
	nestedConfig := make(map[string]interface{})
	if err := json.Unmarshal(data, &nestedConfig); err != nil {
		return nil, err
	}

	plainConfig := flattenRecursive(nestedConfig)
	return plainConfig, nil
}

func (s *Service) getConfigItemsFromPDToChannel(ch chan<- channelItem) {
	r, err := s.getConfigItemsFromPD()
	if err != nil {
		ch <- channelItem{Err: ErrListConfigItemsFailed.Wrap(err, "Failed to list PD config items")}
		return
	}
	ch <- channelItem{
		Err:        nil,
		SourceKind: ItemKindPDConfig,
		Values:     r,
	}
}

func (s *Service) getConfigItemsFromPD() (map[string]interface{}, error) {
	data, err := s.params.PDClient.SendGetRequest("/config")
	if err != nil {
		return nil, err
	}
	return processNestedConfigAPIResponse(data)
}

func (s *Service) getConfigItemsFromTiDBToChannel(tidb *topology.TiDBInfo, ch chan<- channelItem) {
	displayAddress := net.JoinHostPort(tidb.IP, strconv.Itoa(int(tidb.Port)))

	r, err := s.getConfigItemsFromTiDB(tidb.IP, int(tidb.StatusPort))
	if err != nil {
		ch <- channelItem{Err: ErrListConfigItemsFailed.Wrap(err, "Failed to list %s config items of %s", distro.R().TiDB, displayAddress)}
		return
	}
	ch <- channelItem{
		Err:                  nil,
		SourceDisplayAddress: displayAddress,
		SourceKind:           ItemKindTiDBConfig,
		Values:               r,
	}
}

func (s *Service) getConfigItemsFromTiDB(host string, statusPort int) (map[string]interface{}, error) {
	data, err := s.params.TiDBClient.WithStatusAPIAddress(host, statusPort).SendGetRequest("/config")
	if err != nil {
		return nil, err
	}
	return processNestedConfigAPIResponse(data)
}

func (s *Service) getConfigItemsFromTiKVToChannel(tikv *topology.StoreInfo, ch chan<- channelItem) {
	displayAddress := net.JoinHostPort(tikv.IP, strconv.Itoa(int(tikv.Port)))

	r, err := s.getConfigItemsFromTiKV(tikv.IP, int(tikv.StatusPort))
	if err != nil {
		ch <- channelItem{Err: ErrListConfigItemsFailed.Wrap(err, "Failed to list TiKV config items of %s", displayAddress)}
		return
	}
	ch <- channelItem{
		Err:                  nil,
		SourceDisplayAddress: displayAddress,
		SourceKind:           ItemKindTiKVConfig,
		Values:               r,
	}
}

func (s *Service) getConfigItemsFromTiKV(host string, statusPort int) (map[string]interface{}, error) {
	data, err := s.params.TiKVClient.SendGetRequest(host, statusPort, "/config")
	if err != nil {
		return nil, err
	}
	return processNestedConfigAPIResponse(data)
}

type ShowVariableItem struct {
	Name  string `gorm:"column:Variable_name"`
	Value string `gorm:"column:Value"`
}

func (s *Service) getGlobalVariablesFromTiDBToChannel(db *gorm.DB, ch chan<- channelItem) {
	r, err := s.getGlobalVariablesFromTiDB(db)
	if err != nil {
		ch <- channelItem{Err: ErrListConfigItemsFailed.Wrap(err, "Failed to list %s variables", distro.R().TiDB)}
		return
	}
	ch <- channelItem{
		Err:        nil,
		SourceKind: ItemKindTiDBVariable,
		Values:     r,
	}
}

func (s *Service) getGlobalVariablesFromTiDB(db *gorm.DB) (map[string]interface{}, error) {
	var rows []ShowVariableItem
	if err := db.Raw("SHOW GLOBAL VARIABLES").Find(&rows).Error; err != nil {
		return nil, err
	}
	result := make(map[string]interface{})
	for _, r := range rows {
		result[r.Name] = r.Value
	}
	return result, nil
}

type Item struct {
	ID           string      `json:"id"`
	IsEditable   bool        `json:"is_editable"`
	IsMultiValue bool        `json:"is_multi_value"` // TODO: Support per-instance config
	Value        interface{} `json:"value"`          // When multi value present, this contains one of the value
}

type AllConfigItems struct {
	Errors []rest.ErrorResponse `json:"errors"`
	Items  map[ItemKind][]Item  `json:"items"`
}

func (s *Service) getAllConfigItems(db *gorm.DB) (*AllConfigItems, error) {
	tikvInfo, _, err := topology.FetchStoreTopology(s.params.PDClient)
	if err != nil {
		return nil, ErrListTopologyFailed.Wrap(err, "Failed to list TiKV stores")
	}

	tidbInfo, err := topology.FetchTiDBTopology(s.lifecycleCtx, s.params.EtcdClient)
	if err != nil {
		return nil, ErrListTopologyFailed.Wrap(err, "Failed to list %s instances", distro.R().TiDB)
	}

	ch := make(chan channelItem)
	waitItems := 0

	{
		waitItems++
		go s.getConfigItemsFromPDToChannel(ch)
	}
	{
		waitItems++
		go s.getGlobalVariablesFromTiDBToChannel(db, ch)
	}
	for _, item := range tikvInfo {
		// TODO: What about tombstone stores?
		waitItems++
		item2 := item
		go s.getConfigItemsFromTiKVToChannel(&item2, ch)
	}
	for _, item := range tidbInfo {
		waitItems++
		item2 := item
		go s.getConfigItemsFromTiDBToChannel(&item2, ch)
	}

	errors := make([]rest.ErrorResponse, 0)
	successItems := make([]channelItem, 0)

	for i := 0; i < waitItems; i++ {
		item := <-ch
		if item.Err != nil {
			errors = append(errors, rest.NewErrorResponse(err))
			continue
		}
		successItems = append(successItems, item)
	}
	close(ch)

	// The first occurred value of each config item
	valuesMap := make(map[ItemKind]map[string]interface{})
	// Number of config item key occurred to detect missing config items
	occurTimesMap := make(map[ItemKind]map[string]int)
	// Whether each config item has different values
	identicalMap := make(map[ItemKind]map[string]bool)
	// The expected number of occur times
	expectedOccurTimes := make(map[ItemKind]int)

	for _, item := range successItems {
		if _, ok := expectedOccurTimes[item.SourceKind]; !ok {
			expectedOccurTimes[item.SourceKind] = 1
		} else {
			expectedOccurTimes[item.SourceKind]++
		}
		if _, ok := valuesMap[item.SourceKind]; !ok {
			valuesMap[item.SourceKind] = make(map[string]interface{})
			occurTimesMap[item.SourceKind] = make(map[string]int)
			identicalMap[item.SourceKind] = make(map[string]bool)
		}
		for key, value := range item.Values {
			if _, ok := valuesMap[item.SourceKind][key]; !ok {
				valuesMap[item.SourceKind][key] = value
				occurTimesMap[item.SourceKind][key] = 1
				identicalMap[item.SourceKind][key] = true
			} else {
				occurTimesMap[item.SourceKind][key]++
				if value != valuesMap[item.SourceKind][key] {
					identicalMap[item.SourceKind][key] = false
				}
			}
		}
	}

	result := make(map[ItemKind][]Item)
	for kind, v := range valuesMap {
		result[kind] = make([]Item, 0)
		for configKey, configValue := range v {
			// There are two cases when a config item has multiple values:
			// 1. Values are not equal
			// 2. Value is missing
			isMultiValue := !identicalMap[kind][configKey]
			value := configValue
			if !isMultiValue && occurTimesMap[kind][configKey] < expectedOccurTimes[kind] {
				isMultiValue = false
			}

			result[kind] = append(result[kind], Item{
				ID:           configKey,
				IsEditable:   isConfigItemEditable(kind, configKey),
				IsMultiValue: isMultiValue,
				Value:        value,
			})
		}

		s := result[kind]
		sort.Slice(s, func(i, j int) bool {
			return s[i].ID < s[j].ID
		})
	}

	return &AllConfigItems{
		Errors: errors,
		Items:  result,
	}, nil
}

func (s *Service) editConfig(db *gorm.DB, kind ItemKind, id string, newValue interface{}) ([]rest.ErrorResponse, error) {
	if !isConfigItemEditable(kind, id) {
		return nil, ErrNotEditable.New("Configuration `%s` is not editable", id)
	}
	body := make(map[string]interface{})
	body[id] = newValue
	bodyJSON, err := json.Marshal(&body)
	if err != nil {
		return nil, ErrEditFailed.WrapWithNoMessage(err)
	}

	switch kind {
	case ItemKindPDConfig:
		_, err := s.params.PDClient.SendPostRequest("/config", bytes.NewBuffer(bodyJSON))
		if err != nil {
			return nil, ErrEditFailed.WrapWithNoMessage(err)
		}
	case ItemKindTiKVConfig:
		tikvInfo, _, err := topology.FetchStoreTopology(s.params.PDClient)
		if err != nil {
			return nil, ErrEditFailed.WrapWithNoMessage(ErrListTopologyFailed.WrapWithNoMessage(err))
		}
		failures := make([]error, 0)
		for _, kvStore := range tikvInfo {
			// TODO: What about tombstone stores?
			_, err := s.params.TiKVClient.SendPostRequest(kvStore.IP, int(kvStore.StatusPort), "/config", bytes.NewBuffer(bodyJSON))
			if err != nil {
				failures = append(failures, ErrEditFailed.Wrap(err, "Failed to edit config for TiKV instance `%s`", net.JoinHostPort(kvStore.IP, strconv.Itoa(int(kvStore.Port)))))
			}
		}
		if len(failures) == len(tikvInfo) {
			if len(failures) > 0 {
				return nil, failures[0]
			}
			return nil, nil
		}
		warnings := make([]rest.ErrorResponse, 0)
		for _, err := range failures {
			warnings = append(warnings, rest.NewErrorResponse(err))
		}
		return warnings, nil
	case ItemKindTiDBVariable:
		// We have checked the correctness of id, so no need to worry about injections
		if err := db.Exec(fmt.Sprintf("SET GLOBAL %s = ?", id), newValue).Error; err != nil {
			return nil, ErrEditFailed.WrapWithNoMessage(err)
		}
	default:
		return nil, ErrEditFailed.New("Edit failed, not implemented")
	}

	return nil, nil
}
