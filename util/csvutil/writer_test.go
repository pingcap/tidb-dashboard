// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package csvutil

import (
	"bytes"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

type foo struct {
	Digest          string
	Query           string
	Instance        string
	DB              string
	ConnectionID    string
	Success         int
	Timestamp       float64
	TimestampAsTime float64 `csv:",time"`
	QueryTime       float64
	privateField    string
}

func TestCSVWriter(t *testing.T) {
	buf := bytes.Buffer{}
	w := NewCSVWriter(&buf)
	err := w.WriteAsHeader(&foo{})
	require.NoError(t, err)

	rec := foo{
		Digest:          "digest_foo",
		Query:           "query_bar",
		Instance:        "instance_box",
		DB:              "db_abc",
		ConnectionID:    "id_123",
		Success:         1,
		Timestamp:       456,
		TimestampAsTime: 1633106800.411,
		QueryTime:       789,
		privateField:    "pfxyz",
	}
	err = w.WriteAsRow(&rec)
	require.NoError(t, err)

	rec = foo{
		ConnectionID:    "id123",
		Success:         2,
		Timestamp:       0,
		TimestampAsTime: 0,
		QueryTime:       123,
		privateField:    "pro",
		Digest:          "digestFoo",
		Query:           "queryBar",
		Instance:        "instanceBox",
		DB:              "dbAbc",
	}
	err = w.WriteAsRow(&rec)
	require.NoError(t, err)

	w.Flush()
	expected := `
Digest,Query,Instance,DB,ConnectionID,Success,Timestamp,TimestampAsTime,QueryTime
digest_foo,query_bar,instance_box,db_abc,id_123,1,456,2021-10-01 16:46:40 UTC,789
digestFoo,queryBar,instanceBox,dbAbc,id123,2,0,1970-01-01 00:00:00 UTC,123
`
	require.Equal(t, strings.TrimSpace(expected), strings.TrimSpace(buf.String()))
}

func TestCSVWriterWriteTimeTag(t *testing.T) {
	//nolint:govet
	type fooStruct struct {
		Field1 int `csv:`
		Field2 int `foo`
		Field3 int `foo,bar`
		Field4 int `foo:"" csv:"time"`
		Field5 int `foo:"" csv:","`
		Field6 int `foo:"" csv:",time"`
	}
	buf := bytes.Buffer{}
	w := NewCSVWriter(&buf)
	err := w.WriteAsRow(fooStruct{})
	require.NoError(t, err)
	w.Flush()
	require.Equal(t, "0,0,0,0,0,1970-01-01 00:00:00 UTC\n", buf.String())

	type barStruct struct {
		FieldInt     int     `csv:",time"`
		FieldUint64  uint64  `csv:",time"`
		FieldFloat32 float64 `csv:",time"`
	}
	buf.Reset()
	err = w.WriteAsRow(barStruct{
		FieldInt:     1633106800,
		FieldUint64:  1633106801,
		FieldFloat32: 1633106802,
	})
	require.NoError(t, err)
	w.Flush()
	require.Equal(t, "2021-10-01 16:46:40 UTC,2021-10-01 16:46:41 UTC,2021-10-01 16:46:42 UTC\n", buf.String())
}

func BenchmarkCSVWriterWriteAsHeader(b *testing.B) {
	buf := bytes.Buffer{}
	w := NewCSVWriter(&buf)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = w.WriteAsHeader(&foo{})
	}
}

func BenchmarkCSVWriterWriteAsRow(b *testing.B) {
	b.ReportAllocs()

	buf := bytes.Buffer{}
	w := NewCSVWriter(&buf)

	rec := foo{
		Digest:       "digest_foo",
		Query:        "query_bar",
		Instance:     "instance_box",
		DB:           "db_abc",
		ConnectionID: "id_123",
		Success:      1,
		Timestamp:    456,
		QueryTime:    789,
		privateField: "pfxyz",
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = w.WriteAsRow(&rec)
	}
}
