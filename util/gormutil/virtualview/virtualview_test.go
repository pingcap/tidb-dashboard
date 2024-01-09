// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package virtualview

import (
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/require"

	"github.com/pingcap/tidb-dashboard/util/testutil"
)

func TestVirtualViewSelect(t *testing.T) {
	vv := MustNew(SampleModel{})

	db := testutil.OpenMockDB(t)
	defer db.MustClose()

	var results []SampleModel

	// No field
	db.Mocker().
		ExpectQuery("SELECT NULL AS __HIDDEN_FIELD__ FROM `sample_models`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err := db.Gorm().
		Clauses(vv.Clauses([]string{}).Select()).Find(&results).Error
	require.NoError(t, err)

	// A field with GORM specified column name
	db.Mocker().
		ExpectQuery("SELECT `mydigest` FROM `sample_models`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err = db.Gorm().
		Clauses(vv.Clauses([]string{"digest"}).Select()).Find(&results).Error
	require.NoError(t, err)

	// A field with alternative JSON letter case
	db.Mocker().
		ExpectQuery("SELECT `mydigest` FROM `sample_models`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err = db.Gorm().
		Clauses(vv.Clauses([]string{"DIgest"}).Select()).Find(&results).Error
	require.NoError(t, err)

	// A field without GORM specified column name
	db.Mocker().
		ExpectQuery("SELECT `query_value` FROM `sample_models`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err = db.Gorm().
		Clauses(vv.Clauses([]string{"QueryValue"}).Select()).Find(&results).Error
	require.NoError(t, err)

	db.Mocker().
		ExpectQuery("SELECT `query_value` FROM `sample_models`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err = db.Gorm().
		Clauses(vv.Clauses([]string{"queryVALUE"}).Select()).Find(&results).Error
	require.NoError(t, err)

	// Multiple fields
	db.Mocker().
		ExpectQuery("SELECT `query_value`,`mydigest` FROM `sample_models`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err = db.Gorm().
		Clauses(vv.Clauses([]string{"QueryValue", "digest"}).Select()).Find(&results).Error
	require.NoError(t, err)

	// A field with json alias
	db.Mocker().
		ExpectQuery("SELECT SUM(a+1) AS json_alias FROM `sample_models`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err = db.Gorm().
		Clauses(vv.Clauses([]string{"foo"}).Select()).Find(&results).Error
	require.NoError(t, err)

	db.Mocker().
		ExpectQuery("SELECT SUM(a+1) AS json_alias FROM `sample_models`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err = db.Gorm().
		Clauses(vv.Clauses([]string{"Foo"}).Select()).Find(&results).Error
	require.NoError(t, err)

	// A field that is not exported
	db.Mocker().
		ExpectQuery("SELECT NULL AS __HIDDEN_FIELD__ FROM `sample_models`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err = db.Gorm().
		Clauses(vv.Clauses([]string{"jsonunexported"}).Select()).Find(&results).Error
	require.NoError(t, err)

	// A field with the original JSON name of the field (which should be failed).
	db.Mocker().
		ExpectQuery("SELECT NULL AS __HIDDEN_FIELD__ FROM `sample_models`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err = db.Gorm().
		Clauses(vv.Clauses([]string{"JSONAlias"}).Select()).Find(&results).Error
	require.NoError(t, err)

	// There is an unknown field
	db.Mocker().
		ExpectQuery("SELECT `mydigest` FROM `sample_models`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err = db.Gorm().
		Clauses(vv.Clauses([]string{"query_value", "DIGEST"}).Select()).Find(&results).Error
	require.NoError(t, err)

	// All fields are unknown
	db.Mocker().
		ExpectQuery("SELECT NULL AS __HIDDEN_FIELD__ FROM `sample_models`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err = db.Gorm().
		Clauses(vv.Clauses([]string{"query_value", "xyz"}).Select()).Find(&results).Error
	require.NoError(t, err)

	// A field with vexpr
	db.Mocker().
		ExpectQuery("SELECT PLUS(a, b) AS timestamp FROM `sample_models`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err = db.Gorm().
		Clauses(vv.Clauses([]string{"timestamp"}).Select()).Find(&results).Error
	require.NoError(t, err)

	// Complex field selection
	allFieldNames := []string{"invalidtag", "jsonalias", "foo", "gorminvalid", "queryvalue", "full", "timestamp", "bar", "digest", "jsonunexported", "jsonskip"}
	db.Mocker().
		ExpectQuery("SELECT `invalid_tag`,SUM(a+1) AS json_alias,`gorm_invalid`,`query_value`,PLUS(a, b) AS timestamp,AVG(Time) AS full_col,`mydigest`,`json_skip` FROM `sample_models`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err = db.Gorm().
		Clauses(vv.Clauses(allFieldNames).Select()).Find(&results).Error
	require.NoError(t, err)

	// Update Source Columns.
	// All columns are not a used column.
	vv.SetSourceDBColumns([]string{"abc", "Timestamp", "digest"})
	db.Mocker().
		ExpectQuery("SELECT NULL AS __HIDDEN_FIELD__ FROM `sample_models`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err = db.Gorm().
		Clauses(vv.Clauses(allFieldNames).Select()).Find(&results).Error
	require.NoError(t, err)

	// A computed field is partially matched.
	vv.SetSourceDBColumns([]string{"a"})
	db.Mocker().
		ExpectQuery("SELECT NULL AS __HIDDEN_FIELD__ FROM `sample_models`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err = db.Gorm().
		Clauses(vv.Clauses([]string{"TimeStamp"}).Select()).Find(&results).Error
	require.NoError(t, err)

	// A computed field is fully matched.
	vv.SetSourceDBColumns([]string{"a", "b"})
	db.Mocker().
		ExpectQuery("SELECT PLUS(a, b) AS timestamp FROM `sample_models`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err = db.Gorm().
		Clauses(vv.Clauses([]string{"TimeStamp"}).Select()).Find(&results).Error
	require.NoError(t, err)

	// A computed field itself is given as the source column -- should be treated as missing.
	vv.SetSourceDBColumns([]string{"timestamp"})
	db.Mocker().
		ExpectQuery("SELECT NULL AS __HIDDEN_FIELD__ FROM `sample_models`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err = db.Gorm().
		Clauses(vv.Clauses([]string{"TimeStamp"}).Select()).Find(&results).Error
	require.NoError(t, err)

	// When a computed field itself is given, and all of its base columns are also given, we should
	// always build a computed expression.
	vv.SetSourceDBColumns([]string{"timestamp", "a", "b"})
	db.Mocker().
		ExpectQuery("SELECT PLUS(a, b) AS timestamp FROM `sample_models`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err = db.Gorm().
		Clauses(vv.Clauses([]string{"TIMESTAMP"}).Select()).Find(&results).Error
	require.NoError(t, err)

	// Selecting base columns of a computed expression should not match any columns.
	vv.SetSourceDBColumns([]string{"timestamp", "a", "b"})
	db.Mocker().
		ExpectQuery("SELECT NULL AS __HIDDEN_FIELD__ FROM `sample_models`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err = db.Gorm().
		Clauses(vv.Clauses([]string{"a", "b"}).Select()).Find(&results).Error
	require.NoError(t, err)

	// A non-computed field is given, using its GORM column name.
	vv.SetSourceDBColumns([]string{"mydigest"})
	db.Mocker().
		ExpectQuery("SELECT `mydigest` FROM `sample_models`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err = db.Gorm().
		Clauses(vv.Clauses([]string{"digest"}).Select()).Find(&results).Error
	require.NoError(t, err)

	// If a GORM column name is specified but is not used, then it should be regarded as missing.
	vv.SetSourceDBColumns([]string{"digest"})
	db.Mocker().
		ExpectQuery("SELECT NULL AS __HIDDEN_FIELD__ FROM `sample_models`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err = db.Gorm().
		Clauses(vv.Clauses([]string{"digest"}).Select()).Find(&results).Error
	require.NoError(t, err)

	// When a field contains both GORM column name and vexpr, column name should not be not a filter.
	vv.SetSourceDBColumns([]string{"time"})
	db.Mocker().
		ExpectQuery("SELECT AVG(Time) AS full_col FROM `sample_models`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err = db.Gorm().
		Clauses(vv.Clauses([]string{"bar"}).Select()).Find(&results).Error
	require.NoError(t, err)

	vv.SetSourceDBColumns([]string{"full_col"})
	db.Mocker().
		ExpectQuery("SELECT NULL AS __HIDDEN_FIELD__ FROM `sample_models`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err = db.Gorm().
		Clauses(vv.Clauses([]string{"bar"}).Select()).Find(&results).Error
	require.NoError(t, err)

	// A base column is used in multiple computed columns.
	vv.SetSourceDBColumns([]string{"a", "b"})
	db.Mocker().
		ExpectQuery("SELECT SUM(a+1) AS json_alias,PLUS(a, b) AS timestamp FROM `sample_models`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err = db.Gorm().
		Clauses(vv.Clauses([]string{"foo", "timestamp", "digest"}).Select()).Find(&results).Error
	require.NoError(t, err)

	// Remove Source column filter.
	vv.SetSourceDBColumns(nil)
	db.Mocker().
		ExpectQuery("SELECT SUM(a+1) AS json_alias,PLUS(a, b) AS timestamp,`mydigest` FROM `sample_models`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err = db.Gorm().
		Clauses(vv.Clauses([]string{"foo", "timestamp", "digest"}).Select()).Find(&results).Error
	require.NoError(t, err)

	db.MustMeetMockExpectation()
}

func TestVirtualViewOrderBy(t *testing.T) {
	vv := MustNew(SampleModel{})

	db := testutil.OpenMockDB(t)
	defer db.MustClose()

	var results []SampleModel

	// No field in Clauses().
	c := vv.Clauses([]string{})
	db.Mocker().
		ExpectQuery("SELECT NULL AS __HIDDEN_FIELD__ FROM `sample_models`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err := db.Gorm().
		Clauses(
			c.Select(),
			c.OrderBy([]OrderByField{{"foo", false}}),
		).Find(&results).Error
	require.NoError(t, err)

	// Field is specified in Clauses(), but no field in OrderBy().
	c = vv.Clauses([]string{"foo"})
	db.Mocker().
		ExpectQuery("SELECT SUM(a+1) AS json_alias FROM `sample_models`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err = db.Gorm().
		Clauses(
			c.Select(),
			c.OrderBy([]OrderByField{}),
		).Find(&results).Error
	require.NoError(t, err)

	// A field not in Clauses() will be ignored.
	c = vv.Clauses([]string{"digest"})
	db.Mocker().
		ExpectQuery("SELECT `mydigest` FROM `sample_models`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err = db.Gorm().
		Clauses(
			c.Select(),
			c.OrderBy([]OrderByField{{"foo", false}}),
		).
		Find(&results).Error
	require.NoError(t, err)

	// A field does not really exist will be ignored.
	c = vv.Clauses([]string{"xyz"})
	db.Mocker().
		ExpectQuery("SELECT NULL AS __HIDDEN_FIELD__ FROM `sample_models`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err = db.Gorm().
		Clauses(
			c.Select(),
			c.OrderBy([]OrderByField{{"xyz", false}}),
		).
		Find(&results).Error
	require.NoError(t, err)

	// A field with GORM specified column name
	c = vv.Clauses([]string{"digest"})
	db.Mocker().
		ExpectQuery("SELECT `mydigest` FROM `sample_models` ORDER BY `mydigest` DESC").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err = db.Gorm().
		Clauses(
			c.Select(),
			c.OrderBy([]OrderByField{{"DIGEST", true}}),
		).Find(&results).Error
	require.NoError(t, err)

	// A field without GORM specified column name
	c = vv.Clauses([]string{"QueryValue"})
	db.Mocker().
		ExpectQuery("SELECT `query_value` FROM `sample_models` ORDER BY `query_value`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err = db.Gorm().
		Clauses(
			c.Select(),
			c.OrderBy([]OrderByField{{"queryValue", false}}),
		).Find(&results).Error
	require.NoError(t, err)

	c = vv.Clauses([]string{"queryVALUE"})
	db.Mocker().
		ExpectQuery("SELECT `query_value` FROM `sample_models` ORDER BY `query_value`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err = db.Gorm().
		Clauses(
			c.Select(),
			c.OrderBy([]OrderByField{{"QUERYVALUE", false}}),
		).Find(&results).Error
	require.NoError(t, err)

	// Multiple fields in clauses, use some of it
	c = vv.Clauses([]string{"queryvalue", "digest"})
	db.Mocker().
		ExpectQuery("SELECT `query_value`,`mydigest` FROM `sample_models` ORDER BY `query_value`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err = db.Gorm().
		Clauses(
			c.Select(),
			c.OrderBy([]OrderByField{{"queryValue", false}}),
		).Find(&results).Error
	require.NoError(t, err)

	db.Mocker().
		ExpectQuery("SELECT `query_value`,`mydigest` FROM `sample_models` ORDER BY `mydigest`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err = db.Gorm().
		Clauses(
			c.Select(),
			c.OrderBy([]OrderByField{{"digest", false}}),
		).Find(&results).Error
	require.NoError(t, err)

	db.Mocker().
		ExpectQuery("SELECT `query_value`,`mydigest` FROM `sample_models` ORDER BY `mydigest` DESC,`query_value`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err = db.Gorm().
		Clauses(
			c.Select(),
			c.OrderBy([]OrderByField{
				{"digest", true},
				{"queryValue", false},
			}),
		).Find(&results).Error
	require.NoError(t, err)

	db.Mocker().
		ExpectQuery("SELECT `query_value`,`mydigest` FROM `sample_models` ORDER BY `mydigest` DESC,`query_value`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err = db.Gorm().
		Clauses(
			c.Select(),
			c.OrderBy([]OrderByField{
				{"digest", true},
				{"timestamp", false}, // This field is not in the Clauses()
				{"queryValue", false},
			}),
		).Find(&results).Error
	require.NoError(t, err)

	// A field with json alias
	c = vv.Clauses([]string{"foo"})
	db.Mocker().
		ExpectQuery("SELECT SUM(a+1) AS json_alias FROM `sample_models` ORDER BY `json_alias`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err = db.Gorm().
		Clauses(
			c.Select(),
			c.OrderBy([]OrderByField{{"foo", false}}),
		).Find(&results).Error
	require.NoError(t, err)

	c = vv.Clauses([]string{"FOO"})
	db.Mocker().
		ExpectQuery("SELECT SUM(a+1) AS json_alias FROM `sample_models` ORDER BY `json_alias`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err = db.Gorm().
		Clauses(
			c.Select(),
			c.OrderBy([]OrderByField{{"Foo", false}}),
		).Find(&results).Error
	require.NoError(t, err)

	// A field with the original JSON name of the field should be ignored
	c = vv.Clauses([]string{"foo"})
	db.Mocker().
		ExpectQuery("SELECT SUM(a+1) AS json_alias FROM `sample_models`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err = db.Gorm().
		Clauses(
			c.Select(),
			c.OrderBy([]OrderByField{{"json_alias", false}}),
		).Find(&results).Error
	require.NoError(t, err)

	db.Mocker().
		ExpectQuery("SELECT SUM(a+1) AS json_alias FROM `sample_models`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err = db.Gorm().
		Clauses(
			c.Select(),
			c.OrderBy([]OrderByField{{"jsonalias", false}}),
		).Find(&results).Error
	require.NoError(t, err)

	c = vv.Clauses([]string{"JSONAlias"})
	db.Mocker().
		ExpectQuery("SELECT NULL AS __HIDDEN_FIELD__ FROM `sample_models`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err = db.Gorm().
		Clauses(
			c.Select(),
			c.OrderBy([]OrderByField{{"jsonalias", false}}),
		).Find(&results).Error
	require.NoError(t, err)

	db.Mocker().
		ExpectQuery("SELECT NULL AS __HIDDEN_FIELD__ FROM `sample_models`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err = db.Gorm().
		Clauses(
			c.Select(),
			c.OrderBy([]OrderByField{{"foo", false}}),
		).Find(&results).Error
	require.NoError(t, err)

	// Update Source Columns.
	// Fully match some computed fields.
	vv.SetSourceDBColumns([]string{"a", "b"})
	c = vv.Clauses([]string{"foo", "timestamp", "digest"})
	db.Mocker().
		ExpectQuery("SELECT SUM(a+1) AS json_alias,PLUS(a, b) AS timestamp FROM `sample_models` ORDER BY `json_alias`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err = db.Gorm().
		Clauses(
			c.Select(),
			c.OrderBy([]OrderByField{{"foo", false}}),
		).Find(&results).Error
	require.NoError(t, err)

	db.Mocker().
		ExpectQuery("SELECT SUM(a+1) AS json_alias,PLUS(a, b) AS timestamp FROM `sample_models` ORDER BY `timestamp`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err = db.Gorm().
		Clauses(
			c.Select(),
			c.OrderBy([]OrderByField{{"timestamp", false}}),
		).Find(&results).Error
	require.NoError(t, err)

	db.Mocker().
		ExpectQuery("SELECT SUM(a+1) AS json_alias,PLUS(a, b) AS timestamp FROM `sample_models`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err = db.Gorm().
		Clauses(
			c.Select(),
			c.OrderBy([]OrderByField{{"digest", false}}), // ignored
		).Find(&results).Error
	require.NoError(t, err)

	db.Mocker().
		ExpectQuery("SELECT SUM(a+1) AS json_alias,PLUS(a, b) AS timestamp FROM `sample_models` ORDER BY `json_alias`,`timestamp`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err = db.Gorm().
		Clauses(
			c.Select(),
			c.OrderBy([]OrderByField{
				{"foo", false},
				{"digest", false}, // ignored
				{"timestamp", false},
			}),
		).Find(&results).Error
	require.NoError(t, err)

	// Partially match
	vv.SetSourceDBColumns([]string{"a"})
	c = vv.Clauses([]string{"foo", "timestamp", "digest"})
	db.Mocker().
		ExpectQuery("SELECT SUM(a+1) AS json_alias FROM `sample_models` ORDER BY `json_alias`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err = db.Gorm().
		Clauses(
			c.Select(),
			c.OrderBy([]OrderByField{{"foo", false}}),
		).Find(&results).Error
	require.NoError(t, err)

	db.Mocker().
		ExpectQuery("SELECT SUM(a+1) AS json_alias FROM `sample_models`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err = db.Gorm().
		Clauses(
			c.Select(),
			c.OrderBy([]OrderByField{{"timestamp", false}}), // ignored
		).Find(&results).Error
	require.NoError(t, err)

	db.Mocker().
		ExpectQuery("SELECT SUM(a+1) AS json_alias FROM `sample_models`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err = db.Gorm().
		Clauses(
			c.Select(),
			c.OrderBy([]OrderByField{{"digest", false}}), // ignored
		).Find(&results).Error
	require.NoError(t, err)

	// Match a normal field.
	vv.SetSourceDBColumns([]string{"a", "b", "mydigest"})
	c = vv.Clauses([]string{"foo", "timestamp", "digest"})
	db.Mocker().
		ExpectQuery("SELECT SUM(a+1) AS json_alias,PLUS(a, b) AS timestamp,`mydigest` FROM `sample_models` ORDER BY `json_alias`,`mydigest`,`timestamp`").
		WillReturnRows(sqlmock.NewRows([]string{"some_column"}))
	err = db.Gorm().
		Clauses(
			c.Select(),
			c.OrderBy([]OrderByField{
				{"foo", false},
				{"digest", false},
				{"timestamp", false},
			}),
		).Find(&results).Error
	require.NoError(t, err)

	db.MustMeetMockExpectation()
}
