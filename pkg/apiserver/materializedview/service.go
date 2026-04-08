// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package materializedview

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/fx"
	"gorm.io/gorm"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap/tidb-dashboard/pkg/tidb"
	commonUtils "github.com/pingcap/tidb-dashboard/pkg/utils"
	"github.com/pingcap/tidb-dashboard/util/rest"
)

const (
	materializedViewMaxRangeSeconds = 30 * 24 * 60 * 60
	materializedViewDefaultPage     = 1
	materializedViewDefaultPageSize = 10
	materializedViewMaxPageSize     = 100
)

var materializedViewAllowedStatuses = map[string]struct{}{
	"success": {},
	"failed":  {},
	"running": {},
}

type ServiceParams struct {
	fx.In
	TiDBClient *tidb.Client
	SysSchema  *commonUtils.SysSchema
}

type Service struct {
	params ServiceParams
}

func newService(p ServiceParams) *Service {
	return &Service{params: p}
}

type RefreshHistoryRequest struct {
	BeginTime        int64    `json:"begin_time" form:"begin_time"`
	EndTime          int64    `json:"end_time" form:"end_time"`
	Schema           string   `json:"schema" form:"schema"`
	MaterializedView string   `json:"materialized_view" form:"materialized_view"`
	Status           []string `json:"status" form:"status"`
	MinDuration      float64  `json:"min_duration" form:"min_duration"`
	Page             int      `json:"page" form:"page"`
	PageSize         int      `json:"page_size" form:"page_size"`
	OrderBy          string   `json:"orderBy" form:"orderBy"`
	IsDesc           bool     `json:"desc" form:"desc"`
}

type RefreshHistoryItem struct {
	RefreshJobID     string    `gorm:"column:refresh_job_id" json:"refresh_job_id"`
	Schema           string    `gorm:"column:schema" json:"schema"`
	MaterializedView string    `gorm:"column:materialized_view" json:"materialized_view"`
	RefreshStartTime time.Time `gorm:"column:refresh_time" json:"refresh_time"`
	Duration         *float64  `gorm:"column:duration" json:"duration"`
	RefreshStatus    string    `gorm:"column:refresh_status" json:"refresh_status"`
	RefreshRows      int64     `gorm:"column:refresh_rows" json:"refresh_rows"`
	RefreshReadTSO   string    `gorm:"column:refresh_read_tso" json:"refresh_read_tso"`
	FailedReason     *string   `gorm:"column:refresh_failed_reason" json:"failed_reason"`
}

type RefreshHistoryResponse struct {
	Items []RefreshHistoryItem `json:"items"`
	Total int64                `json:"total"`
}

func registerRouter(r *gin.RouterGroup, auth *user.AuthService, s *Service) {
	endpoint := r.Group("/materialized_view")
	endpoint.Use(auth.MWAuthRequired())
	endpoint.Use(utils.MWConnectTiDB(s.params.TiDBClient))
	{
		endpoint.GET("/list", s.getRefreshHistory)
		endpoint.GET("/detail/:id", s.getRefreshHistoryDetail)
	}
}

func normalizeRefreshHistoryRequest(req *RefreshHistoryRequest) error {
	if req.BeginTime <= 0 || req.EndTime <= 0 {
		return errors.New("begin_time and end_time are required")
	}
	if req.BeginTime > req.EndTime {
		return errors.New("begin_time should not be greater than end_time")
	}
	if req.EndTime-req.BeginTime > materializedViewMaxRangeSeconds {
		return errors.New("refresh_time range should not exceed 30 days")
	}

	req.Schema = strings.TrimSpace(req.Schema)
	req.MaterializedView = strings.TrimSpace(req.MaterializedView)
	if req.Schema == "" {
		return errors.New("schema is required")
	}

	if req.Page <= 0 {
		req.Page = materializedViewDefaultPage
	}
	if req.PageSize <= 0 {
		req.PageSize = materializedViewDefaultPageSize
	}
	if req.PageSize > materializedViewMaxPageSize {
		req.PageSize = materializedViewMaxPageSize
	}
	if req.MinDuration < 0 {
		return errors.New("min_duration should not be negative")
	}

	if req.OrderBy == "" {
		req.OrderBy = "refresh_time"
		req.IsDesc = true
	}

	switch req.OrderBy {
	case "refresh_time", "refresh_duration_sec":
	default:
		return errors.New("unsupported orderBy")
	}

	statusSet := make(map[string]struct{}, len(req.Status))
	normalizedStatuses := make([]string, 0, len(req.Status))
	for _, status := range req.Status {
		status = strings.ToLower(strings.TrimSpace(status))
		if status == "" {
			continue
		}
		if _, ok := materializedViewAllowedStatuses[status]; !ok {
			return errors.New("unsupported refresh status")
		}
		if _, ok := statusSet[status]; ok {
			continue
		}
		statusSet[status] = struct{}{}
		normalizedStatuses = append(normalizedStatuses, status)
	}
	req.Status = normalizedStatuses

	return nil
}

func buildRefreshHistoryBaseQuery(db *gorm.DB, req *RefreshHistoryRequest) *gorm.DB {
	tx := db.
		Table("mysql.tidb_mview_refresh_hist").
		Where("refresh_time BETWEEN FROM_UNIXTIME(?) AND FROM_UNIXTIME(?)", req.BeginTime, req.EndTime).
		Where("mv_schema = ?", req.Schema)

	if req.MaterializedView != "" {
		tx = tx.Where("mv_name = ?", req.MaterializedView)
	}
	if len(req.Status) > 0 {
		tx = tx.Where("refresh_status IN (?)", req.Status)
	}
	if req.MinDuration > 0 {
		tx = tx.Where("refresh_duration_sec >= ?", req.MinDuration)
	}

	return tx
}

func buildRefreshHistoryOrderClause(orderBy string, isDesc bool) string {
	switch orderBy {
	case "refresh_time":
		if isDesc {
			return "refresh_time DESC"
		}
		return "refresh_time ASC"
	case "refresh_duration_sec":
		if isDesc {
			return "refresh_duration_sec DESC"
		}
		return "refresh_duration_sec ASC"
	default:
		return "refresh_time DESC"
	}
}

func QueryRefreshHistory(db *gorm.DB, req *RefreshHistoryRequest) (*RefreshHistoryResponse, error) {
	baseQuery := buildRefreshHistoryBaseQuery(db, req)

	var total int64
	if err := baseQuery.Count(&total).Error; err != nil {
		return nil, err
	}

	items := make([]RefreshHistoryItem, 0, req.PageSize)
	offset := (req.Page - 1) * req.PageSize
	selectStmt := strings.Join([]string{
		"CAST(refresh_job_id AS CHAR) AS refresh_job_id",
		"mv_schema AS `schema`",
		"mv_name AS materialized_view",
		"refresh_time",
		"CAST(refresh_duration_sec AS DOUBLE) AS duration",
		"refresh_status",
		"refresh_rows",
		"CAST(refresh_read_tso AS CHAR) AS refresh_read_tso",
		"refresh_failed_reason",
	}, ", ")

	err := buildRefreshHistoryBaseQuery(db, req).
		Select(selectStmt).
		Order(buildRefreshHistoryOrderClause(req.OrderBy, req.IsDesc)).
		Offset(offset).
		Limit(req.PageSize).
		Find(&items).Error
	if err != nil {
		return nil, err
	}

	return &RefreshHistoryResponse{
		Items: items,
		Total: total,
	}, nil
}

// @Summary List materialized view refresh histories
// @Param q query RefreshHistoryRequest true "Query"
// @Success 200 {object} RefreshHistoryResponse
// @Router /materialized_view/list [get]
// @Security JwtAuth
// @Failure 400 {object} rest.ErrorResponse
// @Failure 401 {object} rest.ErrorResponse
func (s *Service) getRefreshHistory(c *gin.Context) {
	var req RefreshHistoryRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		rest.Error(c, rest.ErrBadRequest.NewWithNoMessage())
		return
	}
	if err := normalizeRefreshHistoryRequest(&req); err != nil {
		rest.Error(c, rest.ErrBadRequest.NewWithNoMessage())
		return
	}

	db := utils.GetTiDBConnection(c)
	result, err := QueryRefreshHistory(db, &req)
	if err != nil {
		rest.Error(c, err)
		return
	}

	c.JSON(http.StatusOK, result)
}

func QueryRefreshHistoryDetail(db *gorm.DB, id string) (*RefreshHistoryItem, error) {
	var item RefreshHistoryItem
	selectStmt := strings.Join([]string{
		"CAST(refresh_job_id AS CHAR) AS refresh_job_id",
		"mv_schema AS `schema`",
		"mv_name AS materialized_view",
		"refresh_time",
		"CAST(refresh_duration_sec AS DOUBLE) AS duration",
		"refresh_status",
		"refresh_rows",
		"CAST(refresh_read_tso AS CHAR) AS refresh_read_tso",
		"refresh_failed_reason",
	}, ", ")

	err := db.Table("mysql.tidb_mview_refresh_hist").
		Select(selectStmt).
		Where("refresh_job_id = ?", id).
		First(&item).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("refresh history not found")
		}
		return nil, err
	}
	return &item, nil
}

// @Summary Get materialized view refresh history detail
// @Param id path string true "Refresh Job ID"
// @Success 200 {object} RefreshHistoryItem
// @Router /materialized_view/detail/{id} [get]
// @Security JwtAuth
// @Failure 400 {object} rest.ErrorResponse
// @Failure 401 {object} rest.ErrorResponse
func (s *Service) getRefreshHistoryDetail(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		rest.Error(c, rest.ErrBadRequest.NewWithNoMessage())
		return
	}

	db := utils.GetTiDBConnection(c)
	result, err := QueryRefreshHistoryDetail(db, id)
	if err != nil {
		rest.Error(c, err)
		return
	}

	c.JSON(http.StatusOK, result)
}
