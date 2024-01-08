// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package sso

import (
	"github.com/pingcap/tidb-dashboard/pkg/dbstore"
)

type ImpersonateStatus string

const (
	ImpersonateStatusSuccess           ImpersonateStatus = "success"
	ImpersonateStatusAuthFail          ImpersonateStatus = "auth_fail"
	ImpersonateStatusInsufficientPrivs ImpersonateStatus = "insufficient_privileges"
)

type SSOImpersonationModel struct { // nolint
	SQLUser string `gorm:"primary_key;size:128" json:"sql_user"`
	// The encryption key is placed somewhere else in the FS, to avoid being collected by diagnostics collecting tools.
	EncryptedPass         string             `gorm:"type:text" json:"-"`
	LastImpersonateStatus *ImpersonateStatus `gorm:"size:32" json:"last_impersonate_status"`
}

func (SSOImpersonationModel) TableName() string {
	return "sso_impersonation"
}

func autoMigrate(db *dbstore.DB) error {
	return db.AutoMigrate(&SSOImpersonationModel{})
}
