// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package pdclient

// TODO: Switch to use swagger.

type GetStatusResponse struct {
	StartTimestamp int64 `json:"start_timestamp"`
}

func (api *APIClient) GetStatus() (resp *GetStatusResponse, err error) {
	_, err = api.LR().Get("/status").ReadBodyAsJSON(resp)
	return
}

type GetHealthResponse []struct {
	MemberID uint64 `json:"member_id"`
	Health   bool   `json:"health"`
}

func (api *APIClient) GetHealth() (resp *GetHealthResponse, err error) {
	_, err = api.LR().Get("/health").ReadBodyAsJSON(resp)
	return
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

func (api *APIClient) GetMembers() (resp *GetMembersResponse, err error) {
	_, err = api.LR().Get("/members").ReadBodyAsJSON(resp)
	return
}

type GetConfigReplicateResponse struct {
	LocationLabels string `json:"location-labels"`
}

func (api *APIClient) GetConfigReplicate() (resp *GetConfigReplicateResponse, err error) {
	_, err = api.LR().Get("/config/replicate").ReadBodyAsJSON(resp)
	return
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

func (api *APIClient) GetStores() (resp *GetStoresResponse, err error) {
	_, err = api.LR().Get("/stores").ReadBodyAsJSON(resp)
	return
}
