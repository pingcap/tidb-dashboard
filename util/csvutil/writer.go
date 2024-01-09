// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package csvutil

import (
	"encoding/csv"
	"fmt"
	"io"
	"reflect"
	"time"

	"github.com/fatih/structtag"
	"github.com/henrylee2cn/ameda"

	"github.com/pingcap/tidb-dashboard/util/reflectutil"
	"github.com/pingcap/tidb-dashboard/util/timeutil"
)

// isFieldTaggedAsTime parses the csv field and check whether there is a `time` option.
func isFieldTaggedAsTime(field reflect.StructField) bool {
	switch field.Type.Kind() {
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64,
		reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64, reflect.Uintptr,
		reflect.Float32, reflect.Float64:
	// Accept and do nothing
	default:
		return false
	}

	tags, err := structtag.Parse(string(field.Tag))
	if err != nil {
		return false
	}
	tag, err := tags.Get("csv")
	if err != nil {
		return false
	}
	return tag.HasOption("time")
}

type CSVWriter struct {
	cw *csv.Writer

	rowBuf []string

	// The following cache is valid when the passed-in interface's type is unchanged.
	cacheFieldIsExported []bool
	cacheFieldIsTime     []bool
	cacheTypeID          uintptr
}

func NewCSVWriter(w io.Writer) *CSVWriter {
	return &CSVWriter{
		cw:                   csv.NewWriter(w),
		rowBuf:               make([]string, 0, 32),
		cacheFieldIsExported: make([]bool, 0, 8),
		cacheFieldIsTime:     make([]bool, 0, 8),
	}
}

// ensureCacheValid caches information about the fields of `s`.
func (w *CSVWriter) ensureCacheValid(objType reflect.Type) {
	typeID := ameda.RuntimeTypeID(objType)
	if typeID == w.cacheTypeID {
		return
	}
	w.cacheTypeID = typeID
	w.cacheFieldIsExported = w.cacheFieldIsExported[:0]
	w.cacheFieldIsTime = w.cacheFieldIsTime[:0]
	fieldsCount := objType.NumField()
	for i := 0; i < fieldsCount; i++ {
		f := objType.Field(i)
		w.cacheFieldIsExported = append(w.cacheFieldIsExported, reflectutil.IsFieldExported(f))
		w.cacheFieldIsTime = append(w.cacheFieldIsTime, isFieldTaggedAsTime(f))
	}
}

func (w *CSVWriter) WriteAsHeader(s interface{}) error {
	objValue := reflect.Indirect(reflect.ValueOf(s))
	objType := objValue.Type()
	fieldsCount := objType.NumField()
	w.ensureCacheValid(objType)

	w.rowBuf = w.rowBuf[:0]
	for i := 0; i < fieldsCount; i++ {
		if !w.cacheFieldIsExported[i] {
			continue
		}
		name := objType.Field(i).Name
		w.rowBuf = append(w.rowBuf, name)
	}
	return w.cw.Write(w.rowBuf)
}

func (w *CSVWriter) WriteAsRow(s interface{}) error {
	objValue := reflect.Indirect(reflect.ValueOf(s))
	objType := objValue.Type()
	fieldsCount := objType.NumField()
	w.ensureCacheValid(objType)

	w.rowBuf = w.rowBuf[:0]
	for i := 0; i < fieldsCount; i++ {
		if !w.cacheFieldIsExported[i] {
			continue
		}
		fv := objValue.Field(i).Interface() // ~300ns
		if w.cacheFieldIsTime[i] {
			ts, _ := ameda.InterfaceToInt64(fv)
			w.rowBuf = append(w.rowBuf, timeutil.FormatInUTC(time.Unix(ts, 0)))
			continue
		}
		w.rowBuf = append(w.rowBuf, fmt.Sprint(fv)) // ~1000ns
	}
	return w.cw.Write(w.rowBuf)
}

func (w *CSVWriter) Flush() {
	w.cw.Flush()
}
