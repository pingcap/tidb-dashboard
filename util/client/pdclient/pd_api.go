// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package pdclient

// TODO: Switch to use swagger.

type GetStatusResponse struct {
	StartTimestamp int64 `json:"start_timestamp"`
}

func (api *APIClient) GetStatus() (*GetStatusResponse, error) {
	cancel, resp, err := api.LifecycleR().SetJSONResult(&GetStatusResponse{}).Get("/status")
	defer cancel()
	if err != nil {
		return nil, err
	}
	return resp.Result().(*GetStatusResponse), nil
}

type GetHealthResponse []struct {
	MemberID uint64 `json:"member_id"`
	Health   bool   `json:"health"`
}

func (api *APIClient) GetHealth() (*GetHealthResponse, error) {
	cancel, resp, err := api.LifecycleR().SetJSONResult(&GetHealthResponse{}).Get("/health")
	defer cancel()
	if err != nil {
		return nil, err
	}
	return resp.Result().(*GetHealthResponse), nil
}

type GetMembersResponse struct {
	Members []struct {
		GitHash       string   `json:"git_hash"`
		ClientUrls    []string `json:"client_urls"`
		DeployPath    string   `json:"deploy_path"`
		BinaryVersion string   `json:"binary_version"`
		MemberID      uint64   `json:"member_id"`
	} `json:"members"`
}

func (api *APIClient) GetMembers() (*GetMembersResponse, error) {
	cancel, resp, err := api.LifecycleR().SetJSONResult(&GetMembersResponse{}).Get("/members")
	defer cancel()
	if err != nil {
		return nil, err
	}
	return resp.Result().(*GetMembersResponse), nil
}

type GetConfigReplicateResponse struct {
	LocationLabels string `json:"location-labels"`
}

func (api *APIClient) GetConfigReplicate() (*GetConfigReplicateResponse, error) {
	cancel, resp, err := api.LifecycleR().SetJSONResult(&GetConfigReplicateResponse{}).Get("/config/replicate")
	defer cancel()
	if err != nil {
		return nil, err
	}
	return resp.Result().(*GetConfigReplicateResponse), nil
}

type GetStoresResponseStore struct {
	Address string `json:"address"`
	ID      int    `json:"id"`
	Labels  []struct {
		Key   string `json:"key"`
		Value string `json:"value"`
	} `json:"labels"`
	StateName      string `json:"state_name"`
	Version        string `json:"version"`
	StatusAddress  string `json:"status_address"`
	GitHash        string `json:"git_hash"`
	DeployPath     string `json:"deploy_path"`
	StartTimestamp int64  `json:"start_timestamp"`
}

type GetStoresResponse struct {
	Stores []struct {
		Store GetStoresResponseStore
	} `json:"stores"`
}

func (api *APIClient) GetStores() (*GetStoresResponse, error) {
	cancel, resp, err := api.LifecycleR().SetJSONResult(&GetStoresResponse{}).Get("/stores")
	defer cancel()
	if err != nil {
		return nil, err
	}
	return resp.Result().(*GetStoresResponse), nil
}
