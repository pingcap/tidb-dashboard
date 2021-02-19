package trace

import (
	"encoding/json"

	"github.com/pingcap/kvproto/pkg/kvrpcpb"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/dbstore"
)

type Model struct {
	TraceID  int64  `json:"trace_id" gorm:"primary_key"`
	SpanSets []byte `json:"span_sets" gorm:"type:blob"`
}

type SpanSet struct {
	NodeType string `json:"node_type"`
	Spans    []Span `json:"spans"`
}

type Span struct {
	SpanID          uint64     `json:"span_id"`
	ParentID        uint64     `json:"parent_id"`
	BeginUnixTimeNs uint64     `json:"begin_unix_time_ns"`
	DurationNs      uint64     `json:"duration_ns"`
	Event           string     `json:"event"`
	Properties      []Property `json:"properties,omitempty"`
}

type Property struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

func (Model) TableName() string {
	return "trace"
}

func autoMigrate(db *dbstore.DB) error {
	return db.AutoMigrate(&Model{}).Error
}

func mapPbToModel(traceID uint64, traceDetail kvrpcpb.TraceDetail) *Model {
	spanSets := make([]SpanSet, 0, len(traceDetail.SpanSets))
	for _, set := range traceDetail.SpanSets {
		if set.TraceId != traceID {
			// TODO: seems never reach here
			continue
		}

		spans := make([]Span, 0, len(set.Spans))
		idConv := idConverter{idPrefix: set.SpanIdPrefix}

		for _, span := range set.Spans {
			parentID := idConv.convert(span.ParentId)
			// Root Span
			if parentID == 0 {
				parentID = set.RootParentSpanId
			}

			spans = append(spans, Span{
				SpanID:          idConv.convert(span.Id),
				ParentID:        parentID,
				BeginUnixTimeNs: span.BeginUnixTimeNs,
				DurationNs:      span.DurationNs,
				Event:           span.Event,
				Properties:      mapProperties(span.Properties),
			})
		}

		spanSets = append(spanSets, SpanSet{
			NodeType: mapNodeType(set.NodeType),
			Spans:    spans,
		})
	}

	spanSetsBytes, _ := json.Marshal(spanSets)
	return &Model{
		TraceID:  int64(traceID),
		SpanSets: spanSetsBytes,
	}
}

type idConverter struct {
	idPrefix uint32
}

func (c idConverter) convert(prevID uint32) uint64 {
	return uint64(c.idPrefix)<<32 | uint64(prevID)
}

func mapProperties(pbProperties []*kvrpcpb.TraceDetail_Span_Property) (res []Property) {
	for _, p := range pbProperties {
		res = append(res, Property{
			Key:   p.Key,
			Value: p.Value,
		})
	}

	return
}

func mapNodeType(pdNodeType kvrpcpb.TraceDetail_NodeType) (res string) {
	switch pdNodeType {
	case kvrpcpb.TraceDetail_TiDB:
		res = "TiDB"
	case kvrpcpb.TraceDetail_TiKV:
		res = "TiKV"
	case kvrpcpb.TraceDetail_PD:
		res = "PD"
	default:
		res = "Unknown"
	}

	return
}
