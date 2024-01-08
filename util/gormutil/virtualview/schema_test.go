// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package virtualview

import (
	"encoding/json"
	"reflect"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/require"

	"github.com/pingcap/tidb-dashboard/util/testutil"
)

func TestParseExprDependencies(t *testing.T) {
	tests := []struct {
		want []string
		args string
	}{
		{[]string{"my_col"}, "my_col"},
		{[]string{"col2", "my_col"}, "my_col + 1.0 * col2"},
		{[]string{"time"}, "(UNIX_TIMESTAMP(Time) + 0E0)"},
		{[]string{"bar", "time"}, "Floor(Foo(Time, 'abc', Def(), Bar))"},
		{[]string{"avg_process_time", "exec_count", "sum_cop_task_num"}, "SUM(exec_count * avg_process_time) / SUM(sum_cop_task_num)"},
		{[]string{"bar"}, "Def() + Bar"},
		{[]string{"col0", "col1"}, "Plus(Col1 * col1) + COL0"},
	}
	for _, tt := range tests {
		v, err := parseExprDependencies(tt.args)
		require.NoError(t, err)
		require.Equal(t, tt.want, v)
	}

	failTests := []string{
		"CAST(exec_count AS SIGNED)",
		"Floor(",
		"Def() + Bar)",
		"",
	}
	for _, tt := range failTests {
		_, err := parseExprDependencies(tt)
		require.Error(t, err)
	}
}

func TestDecodeFieldAssumptionJSON(t *testing.T) {
	// For JSON, when it is not specified in the json tag, field name is used:
	type TestModel struct {
		QueryValue     string
		JSONUnexported string `json:"-"`
		JSONSkip       string `json:",omitempty"`
	}
	val, err := json.Marshal(TestModel{
		QueryValue:     "a",
		JSONUnexported: "b",
		JSONSkip:       "c",
	})
	require.NoError(t, err)
	require.JSONEq(t, `{"QueryValue":"a","JSONSkip":"c"}`, string(val))
}

func TestDecodeFieldAssumptionGORM(t *testing.T) {
	// For GORM, when it is not specified in the tag, default naming strategy will be used:
	//nolint:govet
	type TestModel struct {
		GORMOmit    string
		QueryValue  string `gorm:"column:qv"`
		GORMSkip    string `gorm:"primaryKey"`
		GORMInvalid string `gorm:"foo"`
		InvalidTag  string `abc`
	}

	db := testutil.OpenMockDB(t)
	defer db.MustClose()

	db.Mocker().
		ExpectExec("CREATE TABLE `test_models` (`gorm_omit` longtext,`qv` longtext,`gorm_skip` varchar(191),`gorm_invalid` longtext,`invalid_tag` longtext,PRIMARY KEY (`gorm_skip`))").
		WillReturnResult(sqlmock.NewResult(0, 1))

	err := db.Gorm().Migrator().CreateTable(TestModel{})
	require.NoError(t, err)

	db.MustMeetMockExpectation()
}

//nolint:govet
type SampleModel struct {
	Digest         string `gorm:"column:MyDigest" json:"digest"`
	QueryValue     string
	Timestamp      float64 `gorm:"column:timestamp" vexpr:"PLUS(a, b)"`
	JSONUnexported string  `json:"-"`
	JSONSkip       string  `json:",omitempty"`
	InvalidTag     string  `abc`
	GORMInvalid    string  `gorm:"foo"`
	JSONAlias      string  `vexpr:"SUM(a+1)" json:"foo"`
	Full           string  `vexpr:"AVG(Time)" json:"bar" gorm:"column:full_col"`
}

func TestDecodeField(t *testing.T) {
	ft := reflect.TypeOf(SampleModel{})
	f, err := decodeField(ft.Field(0))
	require.NoError(t, err)
	require.Equal(t, "digest", f.jsonNameL)
	require.Equal(t, "", f.viewExpr)
	require.Equal(t, "mydigest", f.columnNameL)

	f, err = decodeField(ft.Field(1))
	require.NoError(t, err)
	require.Equal(t, "queryvalue", f.jsonNameL)
	require.Equal(t, "", f.viewExpr)
	require.Equal(t, "query_value", f.columnNameL)

	f, err = decodeField(ft.Field(2))
	require.NoError(t, err)
	require.Equal(t, "timestamp", f.jsonNameL)
	require.Equal(t, "PLUS(a, b)", f.viewExpr)
	require.Equal(t, "timestamp", f.columnNameL)

	f, err = decodeField(ft.Field(3))
	require.NoError(t, err)
	require.Equal(t, "", f.jsonNameL)
	require.Equal(t, "", f.viewExpr)
	require.Equal(t, "json_unexported", f.columnNameL)

	f, err = decodeField(ft.Field(4))
	require.NoError(t, err)
	require.Equal(t, "jsonskip", f.jsonNameL)
	require.Equal(t, "", f.viewExpr)
	require.Equal(t, "json_skip", f.columnNameL)

	f, err = decodeField(ft.Field(5))
	require.NoError(t, err)
	require.Equal(t, "invalidtag", f.jsonNameL)
	require.Equal(t, "", f.viewExpr)
	require.Equal(t, "invalid_tag", f.columnNameL)

	f, err = decodeField(ft.Field(6))
	require.NoError(t, err)
	require.Equal(t, "gorminvalid", f.jsonNameL)
	require.Equal(t, "", f.viewExpr)
	require.Equal(t, "gorm_invalid", f.columnNameL)

	f, err = decodeField(ft.Field(7))
	require.NoError(t, err)
	require.Equal(t, "foo", f.jsonNameL)
	require.Equal(t, "SUM(a+1)", f.viewExpr)
	require.Equal(t, "json_alias", f.columnNameL)

	f, err = decodeField(ft.Field(8))
	require.NoError(t, err)
	require.Equal(t, "bar", f.jsonNameL)
	require.Equal(t, "AVG(Time)", f.viewExpr)
	require.Equal(t, "full_col", f.columnNameL)
}

func TestParseViewModelSchemaSuccess(t *testing.T) {
	schema, err := parseViewModelSchema(&SampleModel{})
	require.NoError(t, err)

	require.Equal(t, 8, len(schema.fields))
	require.Equal(t, "digest", schema.fields[0].jsonNameL)
	require.Equal(t, "queryvalue", schema.fields[1].jsonNameL)
	require.Equal(t, "timestamp", schema.fields[2].jsonNameL)
	require.Equal(t, "jsonskip", schema.fields[3].jsonNameL)
	require.Equal(t, "invalidtag", schema.fields[4].jsonNameL)
	require.Equal(t, "gorminvalid", schema.fields[5].jsonNameL)
	require.Equal(t, "foo", schema.fields[6].jsonNameL)
	require.Equal(t, "bar", schema.fields[7].jsonNameL)

	require.Equal(t, schema.fields[0], schema.fieldByJSONNameL["digest"])
	require.Equal(t, schema.fields[1], schema.fieldByJSONNameL["queryvalue"])
	require.Equal(t, schema.fields[3], schema.fieldByJSONNameL["jsonskip"])
	require.Equal(t, schema.fields[6], schema.fieldByJSONNameL["foo"])
	require.Equal(t, schema.fields[7], schema.fieldByJSONNameL["bar"])

	require.Equal(t, schema.fields[0], schema.fieldByColumnNameL["mydigest"])
	require.Equal(t, schema.fields[1], schema.fieldByColumnNameL["query_value"])
	require.Equal(t, schema.fields[4], schema.fieldByColumnNameL["invalid_tag"])
	require.Equal(t, schema.fields[6], schema.fieldByColumnNameL["json_alias"])
	require.Equal(t, schema.fields[7], schema.fieldByColumnNameL["full_col"])

	// Test passing struct directly
	schema, err = parseViewModelSchema(SampleModel{})
	require.NoError(t, err)

	require.Equal(t, 8, len(schema.fields))
	require.Equal(t, "digest", schema.fields[0].jsonNameL)
	require.Equal(t, "queryvalue", schema.fields[1].jsonNameL)
	require.Equal(t, "timestamp", schema.fields[2].jsonNameL)
	require.Equal(t, "jsonskip", schema.fields[3].jsonNameL)
	require.Equal(t, "invalidtag", schema.fields[4].jsonNameL)
	require.Equal(t, "gorminvalid", schema.fields[5].jsonNameL)
	require.Equal(t, "foo", schema.fields[6].jsonNameL)
	require.Equal(t, "bar", schema.fields[7].jsonNameL)
}

func TestParseViewModelSchemaFailure(t *testing.T) {
	type Model struct {
		Digest string `gorm:"column:MyDigest" json:"digest"`
		Foo    string `vexpr:"invalidExpr(a,"`
	}
	_, err := parseViewModelSchema(&Model{})
	require.Error(t, err)

	_, err = parseViewModelSchema(Model{})
	require.Error(t, err)
}

func TestUpdateFieldsAvailability(t *testing.T) {
	schema, err := parseViewModelSchema(&SampleModel{})
	require.NoError(t, err)
	require.Equal(t, 8, len(schema.fields))

	requireFieldsInvalid := func(status ...bool) {
		require.Equal(t, len(status), len(schema.fields))
		for idx, s := range status {
			require.Equal(t, s, schema.fields[idx].isInvalid,
				"expect invalid=%v for field[%d], got invalid=%v",
				s, idx, schema.fields[idx].isInvalid)
		}
	}

	requireFieldsInvalid(false, false, false, false, false, false, false, false)

	schema.updateFieldsAvailability([]string{})
	requireFieldsInvalid(true, true, true, true, true, true, true, true)

	schema.updateFieldsAvailability(nil)
	requireFieldsInvalid(false, false, false, false, false, false, false, false)

	schema.updateFieldsAvailability([]string{"Query_Value"})
	requireFieldsInvalid(true, false, true, true, true, true, true, true)

	schema.updateFieldsAvailability([]string{"c"})
	requireFieldsInvalid(true, true, true, true, true, true, true, true)

	schema.updateFieldsAvailability([]string{"a"})
	requireFieldsInvalid(true, true, true, true, true, true, false, true)

	schema.updateFieldsAvailability([]string{"a", "B"})
	requireFieldsInvalid(true, true, false, true, true, true, false, true)

	schema.updateFieldsAvailability([]string{"query_value", "A", "B"})
	requireFieldsInvalid(true, false, false, true, true, true, false, true)

	schema.updateFieldsAvailability([]string{"queryvalue", "A", "B"})
	requireFieldsInvalid(true, true, false, true, true, true, false, true)

	schema.updateFieldsAvailability([]string{"timestamp"})
	requireFieldsInvalid(true, true, true, true, true, true, true, true)

	schema.updateFieldsAvailability([]string{"query_value", "GORM_INVALID", "A", "B"})
	requireFieldsInvalid(true, false, false, true, true, false, false, true)

	schema.updateFieldsAvailability([]string{"query_value", "digest", "json_skip", "foobar"})
	requireFieldsInvalid(true, false, true, false, true, true, true, true)

	schema.updateFieldsAvailability([]string{"query_value", "digest", "MYDIGEST", "json_skip", "foobar"})
	requireFieldsInvalid(false, false, true, false, true, true, true, true)
}
