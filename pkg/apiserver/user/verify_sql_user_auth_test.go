// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package user

import (
	"errors"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/joomcode/errorx"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"

	"github.com/pingcap/tidb-dashboard/util/testutil"
)

type sqlUserTestClient struct {
	config    string
	db        *gorm.DB
	openCalls int
}

func (c *sqlUserTestClient) SendGetRequest(path string) ([]byte, error) {
	if path != "/config" {
		return nil, errors.New("unexpected status path")
	}
	return []byte(c.config), nil
}

func (c *sqlUserTestClient) OpenSQLConn(_, _ string) (*gorm.DB, error) {
	c.openCalls++
	return c.db, nil
}

func TestVerifySQLUserRejectsDisabledGrantTables(t *testing.T) {
	client := &sqlUserTestClient{config: `{"security":{"skip-grant-table":true}}`}
	writeable, err := verifySQLUser(client, "root", "")
	require.Error(t, err)
	require.True(t, errorx.IsOfType(err, ErrInsufficientPrivs))
	require.False(t, writeable)
	require.Zero(t, client.openCalls, "maintenance mode must not authenticate or grant a session")
}

func TestVerifySQLUserPreservesNormalPrivileges(t *testing.T) {
	for _, tc := range []struct {
		name      string
		grants    string
		writeable bool
	}{
		{"writer", "GRANT ALL PRIVILEGES ON *.* TO 'root'@'%'", true},
		{"reader", "GRANT PROCESS,SHOW DATABASES,CONFIG,DASHBOARD_CLIENT ON *.* TO 'reader'@'%'", false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			db := testutil.OpenMockDB(t)
			db.Mocker().ExpectQuery("show grants for current_user()").
				WillReturnRows(sqlmock.NewRows([]string{"Grants"}).AddRow(tc.grants))
			db.Mocker().ExpectClose()
			client := &sqlUserTestClient{config: `{"security":{"skip-grant-table":false}}`, db: db.Gorm()}
			writeable, err := verifySQLUser(client, tc.name, "valid-password")
			require.NoError(t, err)
			require.Equal(t, tc.writeable, writeable)
			require.Equal(t, 1, client.openCalls)
			db.MustMeetMockExpectation()
		})
	}
}
