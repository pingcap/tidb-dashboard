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

package sso

import (
	"github.com/pingcap/tidb-dashboard/pkg/dbstore"
)

type ImpersonateStatus string

const (
	ImpersonateStatusSuccess  ImpersonateStatus = "success"
	ImpersonateStatusAuthFail ImpersonateStatus = "auth_fail"
)

type SSOImpersonationModel struct {
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
