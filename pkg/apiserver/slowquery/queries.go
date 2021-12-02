// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package slowquery

import (
	"strings"

	"gorm.io/gorm"
)

const (
	slowQueryTable = "INFORMATION_SCHEMA.CLUSTER_SLOW_QUERY"
)

type GetListRequest struct {
	BeginTime int      `json:"begin_time" form:"begin_time"`
	EndTime   int      `json:"end_time" form:"end_time"`
	DB        []string `json:"db" form:"db"`
	Limit     int      `json:"limit" form:"limit"`
	Text      string   `json:"text" form:"text"`
	OrderBy   string   `json:"orderBy" form:"orderBy"`
	IsDesc    bool     `json:"desc" form:"desc"`

	// for showing slow queries in the statement detail page
	Plans  []string `json:"plans" form:"plans"`
	Digest string   `json:"digest" form:"digest"`

	Fields string `json:"fields" form:"fields"` // example: "Query,Digest"
}

type GetDetailRequest struct {
	Digest    string  `json:"digest" form:"digest"`
	Timestamp float64 `json:"timestamp" form:"timestamp"`
	// TODO: Switch back to uint64 when modern browser as well as Swagger handles BigInt well.
	ConnectID string `json:"connect_id" form:"connect_id"`
}

func QuerySlowLogList(req *GetListRequest, slowQueryColumns []string, db *gorm.DB) ([]Model, error) {
	reqFields := strings.Split(req.Fields, ",")
	selectStmt, err := genSelectStmt(slowQueryColumns, reqFields)
	if err != nil {
		return nil, err
	}

	tx := db.
		Table(slowQueryTable).
		Select(selectStmt)

	if req.BeginTime != 0 && req.EndTime != 0 {
		tx = tx.Where("Time BETWEEN FROM_UNIXTIME(?) AND FROM_UNIXTIME(?)", req.BeginTime, req.EndTime)
	}

	if req.Limit <= 0 {
		req.Limit = 100
	}
	tx = tx.Limit(req.Limit)

	if req.Text != "" {
		lowerStr := strings.ToLower(req.Text)
		arr := strings.Fields(lowerStr)
		for _, v := range arr {
			tx = tx.Where(
				`Txn_start_ts REGEXP ?
				 OR LOWER(Digest) REGEXP ?
				 OR LOWER(CONVERT(Prev_stmt USING utf8)) REGEXP ?
				 OR LOWER(CONVERT(Query USING utf8)) REGEXP ?`,
				v, v, v, v,
			)
		}
	}

	if len(req.DB) > 0 {
		tx = tx.Where("DB IN (?)", req.DB)
	}

	// more robust
	if req.OrderBy == "" {
		req.OrderBy = "timestamp"
	}
	orderStmt, err := genOrderStmt(slowQueryColumns, req.OrderBy, req.IsDesc)
	if err != nil {
		return nil, err
	}

	tx = tx.Order(orderStmt)

	if len(req.Plans) > 0 {
		tx = tx.Where("Plan_digest IN (?)", req.Plans)
	}

	if len(req.Digest) > 0 {
		tx = tx.Where("Digest = ?", req.Digest)
	}

	var results []Model
	err = tx.Find(&results).Error
	if err != nil {
		return nil, err
	}
	return results, nil
}

func (s *Service) querySlowLogDetail(db *gorm.DB, req *GetDetailRequest) (*Model, error) {
	var result Model
	err := db.
		Table(slowQueryTable).
		Select("*, (UNIX_TIMESTAMP(Time) + 0E0) AS timestamp").
		Where("Digest = ?", req.Digest).
		Where("Time = FROM_UNIXTIME(?)", req.Timestamp).
		Where("Conn_id = ?", req.ConnectID).
		First(&result).Error
	if err != nil {
		return nil, err
	}
	return &result, nil
}
