// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package datatype

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/require"

	"github.com/pingcap/tidb-dashboard/util/testutil"
)

func TestTimestampORMType(t *testing.T) {
	type TestModel struct {
		Field Timestamp
	}

	db := testutil.OpenMockDB(t)
	defer db.MustClose()

	db.Mocker().
		ExpectExec("CREATE TABLE `test_models` (`field` TIMESTAMP)").
		WillReturnResult(sqlmock.NewResult(0, 1))

	err := db.Gorm().Migrator().CreateTable(TestModel{})
	require.Nil(t, err)

	db.MustMeetMockExpectation()
}

func TestTimestampJSON(t *testing.T) {
	ts := Timestamp{Time: time.Unix(0, 1633880141307801631)}
	v, err := json.Marshal(ts)
	require.Nil(t, err)
	require.Equal(t, string(v), "1633880141307801")

	ts = Timestamp{Time: time.Unix(0, 500)}
	v, err = json.Marshal(ts)
	require.Nil(t, err)
	require.Equal(t, string(v), "0")

	st := struct {
		Foo Timestamp
	}{
		Foo: Timestamp{Time: time.Unix(0, 1633880141307801631)},
	}
	v, err = json.Marshal(st)
	require.Nil(t, err)
	require.Equal(t, string(v), `{"Foo":1633880141307801}`)

	var ts2 Timestamp
	err = json.Unmarshal([]byte("12345"), &ts2)
	require.Nil(t, err)
	require.Equal(t, int64(12345000), ts2.UnixNano())

	err = json.Unmarshal([]byte(`{"Foo":12345}`), &st)
	require.Nil(t, err)
	require.Equal(t, int64(12345000), st.Foo.UnixNano())

	err = json.Unmarshal([]byte(`{"Foo":"54321"}`), &st)
	require.NotNil(t, err)

	err = json.Unmarshal([]byte(`{"Foo":123.45}`), &st)
	require.NotNil(t, err)

	ts3 := Timestamp{Time: time.Unix(0, 1633880141307801000)}
	v, err = json.Marshal(ts3)
	require.Nil(t, err)
	err = json.Unmarshal(v, &ts2)
	require.Nil(t, err)
	require.Equal(t, ts2, ts3)
}
