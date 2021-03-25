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

package statement

import (
	"fmt"
	"reflect"
	"strings"
	"sync"

	"github.com/jinzhu/gorm"
	"github.com/thoas/go-funk"

	"github.com/pingcap/tidb-dashboard/pkg/utils/sysschema"
)

type aggrService struct {
	rw        sync.RWMutex
	dbColumns []string
	aggrCache map[string]fieldSchema
}

func newAggrService(db *gorm.DB, cacheService *sysschema.CacheService) (*aggrService, error) {
	dc, err := cacheService.GetTableColumnNames(db, statementsTable)
	if err != nil {
		return nil, err
	}
	return &aggrService{dbColumns: dc}, nil
}

type fieldSchema struct {
	DBName string
	JSON   string
	Aggr   string
}

func (s *aggrService) getFieldSchema() map[string]fieldSchema {
	s.rw.RLock()
	if s.aggrCache != nil {
		s.rw.RUnlock()
		return s.aggrCache
	}
	s.rw.RUnlock()

	s.rw.Lock()
	defer s.rw.Unlock()

	t := reflect.TypeOf(Model{})
	fieldsNum := t.NumField()
	fs := map[string]fieldSchema{}

	for i := 0; i < fieldsNum; i++ {
		f := t.Field(i)
		agg, ok := f.Tag.Lookup("agg")
		if !ok {
			continue
		}

		json := strings.ToLower(f.Tag.Get("json"))
		rfs := []string{json}
		rf, ok := f.Tag.Lookup("related")
		if ok {
			rfs = strings.Split(rf, ",")
		}

		if !verifyRelatedFields(s.dbColumns, rfs) {
			continue
		}

		fs[json] = fieldSchema{DBName: gorm.ToColumnName(f.Name), JSON: json, Aggr: agg}
	}

	s.aggrCache = fs
	return fs
}

// Verify that the field associated with the aggregated field exists
func verifyRelatedFields(dbColumns []string, relatedFields []string) bool {
	lowcaseCs := []string{}
	for _, c := range dbColumns {
		lowcaseCs = append(lowcaseCs, strings.ToLower(c))
	}

	return len(funk.Join(lowcaseCs, relatedFields, funk.InnerJoin).([]string)) == len(relatedFields)
}

func (s *aggrService) getAggrs(allowlist ...string) ([]string, error) {
	fs := map[string]fieldSchema{}
	ret := []string{}
	originFs := s.getFieldSchema()

	if len(allowlist) == 0 {
		fs = originFs
	} else {
		for _, name := range allowlist {
			origin, ok := originFs[name]
			if !ok {
				return nil, fmt.Errorf("unknown field %s", name)
			}
			fs[name] = origin
		}
	}

	for i := range fs {
		schema := fs[i]
		ret = append(ret, schemaTrans(&schema))
	}
	return ret, nil
}

func schemaTrans(s *fieldSchema) string {
	if s.Aggr == "" {
		return s.JSON
	}
	return fmt.Sprintf("%s AS %s", s.Aggr, s.DBName)
}
