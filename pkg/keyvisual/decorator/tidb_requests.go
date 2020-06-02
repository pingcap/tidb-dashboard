// Copyright 2019 PingCAP, Inc.
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

package decorator

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/joomcode/errorx"
	"github.com/pingcap/log"
	"go.uber.org/zap"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/tidb/model"
)

const (
	schemaVersionPath = "/tidb/ddl/global_schema_version"
	etcdGetTimeout    = time.Second
)

var (
	ErrNS                    = errorx.NewNamespace("error.keyvisual")
	ErrNSDecorator           = ErrNS.NewSubNamespace("decorator")
	ErrTiDBHTTPRequestFailed = ErrNSDecorator.NewType("tidb_http_request_failed")
)

func (s *tidbLabelStrategy) updateMap(ctx context.Context) {
	// check schema version
	ectx, cancel := context.WithTimeout(ctx, etcdGetTimeout)
	resp, err := s.Provider.EtcdClient.Get(ectx, schemaVersionPath)
	cancel()
	if err != nil || len(resp.Kvs) != 1 {
		log.Warn("failed to get tidb schema version", zap.Error(err))
		return
	}
	schemaVersion, err := strconv.ParseInt(string(resp.Kvs[0].Value), 10, 64)
	if err != nil {
		log.Warn("failed to get tidb schema version", zap.Error(err))
		return
	}
	if schemaVersion == s.SchemaVersion {
		log.Debug("schema version has not changed, skip this update")
		return
	}

	log.Debug("schema version has changed", zap.Int64("old", s.SchemaVersion), zap.Int64("new", schemaVersion))

	// get all database info
	var dbInfos []*model.DBInfo
	reqScheme := "http"
	if s.Config.ClusterTLSConfig != nil {
		reqScheme = "https"
	}
	hostname, port := s.forwarder.GetStatusConnProps()
	tidbEndpoint := fmt.Sprintf("%s://%s:%d", reqScheme, hostname, port)
	if err := request(tidbEndpoint, "schema", &dbInfos, s.HTTPClient); err != nil {
		log.Error("fail to send schema request to TiDB", zap.String("endpoint", tidbEndpoint), zap.Error(err))
		return
	}

	// get all table info
	var tableInfos []*model.TableInfo
	updateSuccess := true
	for _, db := range dbInfos {
		if db.State == model.StateNone {
			continue
		}
		if err := request(tidbEndpoint, fmt.Sprintf("schema/%s", db.Name.O), &tableInfos, s.HTTPClient); err != nil {
			log.Error("fail to send schema request to TiDB", zap.String("endpoint", tidbEndpoint), zap.Error(err))
			updateSuccess = false
			continue
		}
		for _, table := range tableInfos {
			indices := make(map[int64]string, len(table.Indices))
			for _, index := range table.Indices {
				indices[index.ID] = index.Name.O
			}
			detail := &tableDetail{
				Name:    table.Name.O,
				DB:      db.Name.O,
				ID:      table.ID,
				Indices: indices,
			}
			s.TableMap.Store(table.ID, detail)
			if partition := table.GetPartitionInfo(); partition != nil {
				for _, partitionDef := range partition.Definitions {
					detail := &tableDetail{
						Name:    fmt.Sprintf("%s/%s", table.Name.O, partitionDef.Name.O),
						DB:      db.Name.O,
						ID:      partitionDef.ID,
						Indices: indices,
					}
					s.TableMap.Store(partitionDef.ID, detail)
				}
			}
		}
	}

	// update schema version
	if updateSuccess {
		s.SchemaVersion = schemaVersion
	}
}

func request(endpoint string, uri string, v interface{}, httpClient *http.Client) error {
	url := fmt.Sprintf("%s/%s", endpoint, uri)

	// FIXME: Better to assign a context
	resp, err := httpClient.Get(url) //nolint:gosec
	if err != nil {
		return ErrTiDBHTTPRequestFailed.Wrap(err, "TiDB HTTP API request failed")
	}

	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return ErrTiDBHTTPRequestFailed.New("TiDB HTTP API returns non success status code")
	}

	decoder := json.NewDecoder(resp.Body)
	return decoder.Decode(v)
}
