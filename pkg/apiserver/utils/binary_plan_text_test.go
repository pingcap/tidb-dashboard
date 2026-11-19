// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package utils

import (
	"errors"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func TestGenerateBinaryPlanTextBindsPlanValue(t *testing.T) {
	for _, plan := range []string{bpTestStr, "", "plan'); SELECT 'injected'; -- ", "quote'\\\x00"} {
		t.Run(plan, func(t *testing.T) {
			sqlDB, mock, err := sqlmock.New(sqlmock.QueryMatcherOption(sqlmock.QueryMatcherEqual))
			require.NoError(t, err)
			defer sqlDB.Close()
			db, err := gorm.Open(mysql.New(mysql.Config{
				Conn: sqlDB, SkipInitializeWithVersion: true,
			}), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
			require.NoError(t, err)
			mock.ExpectQuery("select tidb_decode_binary_plan(?) as binary_plan_text").
				WithArgs(plan).
				WillReturnRows(sqlmock.NewRows([]string{"binary_plan_text"}).AddRow("decoded plan"))
			text, err := GenerateBinaryPlanText(db, plan)
			require.NoError(t, err)
			require.Equal(t, "decoded plan", text)
			require.NoError(t, mock.ExpectationsWereMet())

			decodeErr := errors.New("invalid binary plan")
			mock.ExpectQuery("select tidb_decode_binary_plan(?) as binary_plan_text").
				WithArgs(plan).WillReturnError(decodeErr)
			text, err = GenerateBinaryPlanText(db, plan)
			require.ErrorIs(t, err, decodeErr)
			require.Empty(t, text)
			require.NoError(t, mock.ExpectationsWereMet())
		})
	}
}
