package trace

import (
	"encoding/json"
	"io/ioutil"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/gogo/protobuf/proto"
	"github.com/pingcap/kvproto/pkg/kvrpcpb"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/utils"
)

func RegisterRouter(r *gin.RouterGroup, s *Service) {
	endpoint := r.Group("/trace")
	endpoint.GET("/query/:traceId", s.queryTrace)
	endpoint.POST("/report", s.reportTrace)
}

type QueryTraceResponse struct {
	TraceID  uint64    `json:"trace_id"`
	SpanSets []SpanSet `json:"span_sets"`
}

// @Summary Get all span sets with a given trace ID
// @Param traceId path string true "trace ID"
// @Success 200 {object} QueryTraceResponse
// @Failure 400 {object} utils.APIError
// @Router /trace/query/{traceId} [get]
func (s *Service) queryTrace(c *gin.Context) {
	traceID, err := strconv.ParseUint(c.Param("traceId"), 10, 64)
	if err != nil {
		utils.MakeInvalidRequestErrorFromError(c, err)
		return
	}

	var traceModel = &Model{}
	if err := s.params.LocalStore.Where("trace_id = ?", int64(traceID)).Find(traceModel).Error; err != nil {
		utils.MakeInvalidRequestErrorFromError(c, err)
		return
	}

	resp := &QueryTraceResponse{TraceID: uint64(traceModel.TraceID)}
	if err := json.Unmarshal(traceModel.SpanSets, &resp.SpanSets); err != nil {
		utils.MakeInvalidRequestErrorFromError(c, err)
		return
	}

	c.JSON(http.StatusOK, resp)
}

type ReportRequest struct {
	TraceID     uint64 `json:"trace_id"`
	TraceDetail []byte `json:"trace_detail"`
}

// @Summary Report tracing results
// @Accept octet-stream
// @Success 200 {object} utils.APIEmptyResponse
// @Failure 400 {object} utils.APIError
// @Router /trace/report [post]
func (s *Service) reportTrace(c *gin.Context) {
	pb, err := ioutil.ReadAll(c.Request.Body)
	if err != nil {
		utils.MakeInvalidRequestErrorFromError(c, err)
		return
	}

	traceDetail := kvrpcpb.TraceDetail{}
	if err := proto.Unmarshal(pb, &traceDetail); err != nil {
		utils.MakeInvalidRequestErrorFromError(c, err)
		return
	}

	if len(traceDetail.SpanSets) == 0{
		utils.MakeInvalidRequestErrorWithMessage(c, "empty trace detail")
		return
	}

	model := mapPbToModel(traceDetail.SpanSets[0].TraceId, traceDetail)
	if err := s.params.LocalStore.Create(&model).Error; err != nil {
		utils.MakeInvalidRequestErrorFromError(c, err)
		return
	}

	c.JSON(http.StatusOK, utils.APIEmptyResponse{})
}
