package clusterinfo

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
)

func fetchAlertManagerCounts(alertManagerAddr string, httpClient *http.Client) (int, error) {
	apiAddress := fmt.Sprintf("http://%s/api/v2/alerts", alertManagerAddr)
	resp, err := httpClient.Get(apiAddress)
	if err != nil {
		return 0, err
	}

	defer resp.Body.Close()
	data, err := ioutil.ReadAll(resp.Body)

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
