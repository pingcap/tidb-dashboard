package clusterinfo

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/httpc"
)

var (
	ErrNSAlerts              = ErrNS.NewSubNamespace("alerts")
	ErrAlertManagerAPIFailed = ErrNSAlerts.NewType("alert_manager_api_failed")
)

type AlertManagerAlert struct {
	Annotations  map[string]string       `json:"annotations"`
	EndsAt       time.Time               `json:"endsAt"`
	Fingerprint  string                  `json:"fingerprint"`
	StartsAt     time.Time               `json:"startsAt"`
	Status       AlertManagerAlertStatus `json:"status"`
	UpdatedAt    time.Time               `json:"updatedAt"`
	GeneratorURL string                  `json:"generatorURL"`
	Labels       map[string]string       `json:"labels"`
}

type AlertManagerAlertStatus struct {
	InhibitedBy []string `json:"inhibitedBy"`
	SilencedBy  []string `json:"silencedBy"`
	State       string   `json:"state"` // Enum: [unprocessed active suppressed]
}

//type PrometheusAlert struct {
//	Labels      map[string]string `json:"labels"`
//	Annotations map[string]string `json:"annotations"`
//	State       string            `json:"state"`
//	ActiveAt    time.Time         `json:"activeAt"`
//	Value       string            `json:"value"`
//}
//
//type PrometheusAlertRuleDiscovery struct {
//	RuleGroups []*PrometheusAlertRuleGroup `json:"groups"`
//}
//
//type PrometheusAlertRuleGroup struct {
//	Name     string                `json:"name"`
//	File     string                `json:"file"`
//	Rules    []PrometheusAlertRule `json:"rules"`
//	Interval float64               `json:"interval"`
//}
//
//type PrometheusAlertRule struct {
//	// Type is "alerting" or "recording". We will filter out recording rules.
//	Type   string            `json:"type"`
//	Name   string            `json:"name"`
//	Query  string            `json:"query"`
//	Labels map[string]string `json:"labels"`
//	Health map[string]string `json:"health"`
//	// The fields below only available to alerting rules.
//	// State can be "pending", "firing", "inactive".
//	State       string             `json:"state"`
//	Duration    float64            `json:"duration"`
//	Annotations map[string]string  `json:"annotations"`
//	Alerts      []*PrometheusAlert `json:"alerts"`
//}

func fetchAlertManagerAlerts(ctx context.Context, alertManagerAddr string, httpClient *httpc.Client) ([]*AlertManagerAlert, error) {
	uri := fmt.Sprintf("http://%s/api/v2/alerts", alertManagerAddr)
	data, err := httpClient.SendRequest(ctx, uri, "GET", nil, ErrAlertManagerAPIFailed, "AlertManager")
	if err != nil {
		return nil, err
	}

	var alerts []*AlertManagerAlert
	err = json.Unmarshal(data, &alerts)
	if err != nil {
		return nil, ErrAlertManagerAPIFailed.Wrap(err, "Invalid API response")
	}

	return alerts, nil
}
