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

package slowquery

import (
	"fmt"
	"reflect"
	"strings"

	"github.com/jinzhu/gorm"
	"github.com/thoas/go-funk"

	"github.com/pingcap/tidb-dashboard/pkg/utils/sysschema"
)

type columnNameService struct {
	dbColumns        []string
	fieldSchemaCache map[string]fieldSchema
}

func newColumnNameService(db *gorm.DB, cacheService *sysschema.CacheService) (*columnNameService, error) {
	dc, err := cacheService.GetTableColumnNames(db, slowQueryTable)
	if err != nil {
		return nil, err
	}
	return &columnNameService{dbColumns: dc}, nil
}

type fieldSchema struct {
	DBName     string
	JSON       string
	Projection string
}

func (s *columnNameService) getFieldSchema() map[string]fieldSchema {
	if s.fieldSchemaCache != nil {
		return s.fieldSchemaCache
	}

	t := reflect.TypeOf(SlowQuery{})
	fieldsNum := t.NumField()
	fs := map[string]fieldSchema{}

	for i := 0; i < fieldsNum; i++ {
		f := t.Field(i)
		// ignore to check error because the field is defined by ourself
		// we can confirm that it has "gorm" tag and fixed structure
		gormField := f.Tag.Get("gorm")
		dbName := strings.Split(gormField, ":")[1]
		json := strings.ToLower(f.Tag.Get("json"))
		projection := f.Tag.Get("proj")

		// filter columns by db schema & projection
		isContainsDBColumns := funk.Contains(s.dbColumns, dbName)
		isProjectionField := projection != ""
		if !isContainsDBColumns && !isProjectionField {
			continue
		}

		fs[json] = fieldSchema{DBName: dbName, JSON: json, Projection: projection}
	}

	s.fieldSchemaCache = fs
	return fs
}

func (s *columnNameService) getColumnNames(allowlist ...string) ([]string, error) {
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
	if s.Projection == "" {
		return s.DBName
	}
	return fmt.Sprintf("%s AS %s", s.Projection, s.DBName)
}
