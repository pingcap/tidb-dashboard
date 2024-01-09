// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package decorator

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"strconv"
	"time"

	"github.com/joomcode/errorx"
	"github.com/pingcap/log"
	"go.uber.org/zap"

	"github.com/pingcap/tidb-dashboard/pkg/tidb/model"
	"github.com/pingcap/tidb-dashboard/util/distro"
)

const (
	schemaVersionPath = "/tidb/ddl/global_schema_version"
	etcdGetTimeout    = time.Second
)

var (
	ErrNS          = errorx.NewNamespace("error.keyvisual")
	ErrNSDecorator = ErrNS.NewSubNamespace("decorator")
	ErrInvalidData = ErrNSDecorator.NewType("invalid_data")
)

func (s *tidbLabelStrategy) updateMap(ctx context.Context) {
	// check schema version
	ectx, cancel := context.WithTimeout(ctx, etcdGetTimeout)
	resp, err := s.EtcdClient.Get(ectx, schemaVersionPath)
	cancel()
	if err != nil || len(resp.Kvs) != 1 {
		if s.SchemaVersion != -1 {
			log.Warn("failed to get tidb schema version", zap.Error(err))
		} else {
			log.Debug("failed to get tidb schema version, maybe not a db cluster", zap.Error(err))
		}
		return
	}
	schemaVersion, err := strconv.ParseInt(string(resp.Kvs[0].Value), 10, 64)
	if err != nil {
		if s.SchemaVersion != -1 {
			log.Warn("failed to get tidb schema version", zap.Error(err))
		} else {
			log.Debug("failed to get tidb schema version, maybe not a db cluster", zap.Error(err))
		}
		return
	}
	if schemaVersion == s.SchemaVersion {
		log.Debug("schema version has not changed, skip this update")
		return
	}

	log.Debug("schema version has changed", zap.Int64("old", s.SchemaVersion), zap.Int64("new", schemaVersion))

	// get all database info
	var dbInfos []*model.DBInfo
	if err := s.request("/schema", &dbInfos); err != nil {
		log.Error("fail to send schema request", zap.String("component", distro.R().TiDB), zap.Error(err))
		return
	}

	// get all table info
	updateSuccess := true
	for _, db := range dbInfos {
		if db.State == model.StateNone {
			continue
		}
		var tableInfos []*model.TableInfo
		encodeName := url.PathEscape(db.Name.O)
		if err := s.request(fmt.Sprintf("/schema/%s", encodeName), &tableInfos); err != nil {
			log.Error("fail to send schema request", zap.String("component", distro.R().TiDB), zap.Error(err))
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

func (s *tidbLabelStrategy) request(path string, v interface{}) error {
	data, err := s.tidbClient.SendGetRequest(path)
	if err != nil {
		return err
	}
	if err = json.Unmarshal(data, v); err != nil {
		return ErrInvalidData.Wrap(err, "%s schema API unmarshal failed", distro.R().TiDB)
	}
	return nil
}
