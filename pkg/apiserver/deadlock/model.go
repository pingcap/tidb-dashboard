// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package deadlock

import "time"

type Model struct {
	Instance       string    `gorm:"column:INSTANCE" json:"instance"`
	DeadlockID     uint64    `gorm:"column:DEADLOCK_ID" json:"id"`
	OccurTime      time.Time `gorm:"column:OCCUR_TIME" json:"occur_time"`
	Retryable      bool      `gorm:"column:RETRYABLE" json:"retryable"`
	TryLockTrxID   uint64    `gorm:"column:TRY_LOCK_TRX_ID" json:"try_lock_trx_id"`
	TryHoldingLock uint64    `gorm:"column:TRX_HOLDING_LOCK" json:"trx_holding_lock"`
	CurrentSQL     string    `gorm:"column:CURRENT_SQL_DIGEST_TEXT" json:"current_sql"`
	Key            string    `gorm:"column:KEY" json:"key"`
	KeyInfo        string    `gorm:"column:KEY_INFO" json:"key_info"`
}
