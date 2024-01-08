// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package clusterinfo

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/pingcap/tidb-dashboard/pkg/httpc"
)

func fetchAlertManagerCounts(ctx context.Context, alertManagerAddr string, httpClient *httpc.Client) (int, error) {
	// FIXME: Use httpClient.SendGetRequest

	uri := fmt.Sprintf("http://%s/api/v2/alerts", alertManagerAddr)
	req, err := http.NewRequestWithContext(ctx, "GET", uri, nil)
	if err != nil {
		return 0, err
	}

	resp, err := httpClient.Do(req)
	if err != nil {
		return 0, err
	}

	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("alert manager API returns non success status code")
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0, err
	}

	var alerts []struct{}
	err = json.Unmarshal(data, &alerts)
	if err != nil {
		return 0, err
	}

	return len(alerts), nil
}
