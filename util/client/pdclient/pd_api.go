// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package pdclient

import (
	"context"
)

// TODO: Switch to use swagger.

const APIPrefix = "/pd/api/v1"

type GetStatusResponse struct {
	StartTimestamp int64 `json:"start_timestamp"`
}

// GetStatus returns the content from /status PD API.
// You must specify the base URL by calling SetDefaultBaseURL() before using this function.
func (api *APIClient) GetStatus(ctx context.Context) (resp *GetStatusResponse, err error) {
	_, err = api.LR().SetContext(ctx).Get(APIPrefix + "/status").ReadBodyAsJSON(&resp)
	return
}

type GetHealthResponseMember struct {
	MemberID uint64 `json:"member_id"`
	Health   bool   `json:"health"`
}

type GetHealthResponse []GetHealthResponseMember

// GetHealth returns the content from /health PD API.
// You must specify the base URL by calling SetDefaultBaseURL() before using this function.
func (api *APIClient) GetHealth(ctx context.Context) (resp *GetHealthResponse, err error) {
	_, err = api.LR().SetContext(ctx).Get(APIPrefix + "/health").ReadBodyAsJSON(&resp)
	return
}

type GetMembersResponseMember struct {
	GitHash       string   `json:"git_hash"`
	ClientUrls    []string `json:"client_urls"`
	DeployPath    string   `json:"deploy_path"`
	BinaryVersion string   `json:"binary_version"`
	MemberID      uint64   `json:"member_id"`
}

type GetMembersResponse struct {
	Members []GetMembersResponseMember `json:"members"`
}

// GetMembers returns the content from /members PD API.
// You must specify the base URL by calling SetDefaultBaseURL() before using this function.
func (api *APIClient) GetMembers(ctx context.Context) (resp *GetMembersResponse, err error) {
	_, err = api.LR().SetContext(ctx).Get(APIPrefix + "/members").ReadBodyAsJSON(&resp)
	return
}

type GetConfigReplicateResponse struct {
	LocationLabels string `json:"location-labels"`
}

// GetConfigReplicate returns the content from /config/replicate PD API.
// You must specify the base URL by calling SetDefaultBaseURL() before using this function.
func (api *APIClient) GetConfigReplicate(ctx context.Context) (resp *GetConfigReplicateResponse, err error) {
	_, err = api.LR().SetContext(ctx).Get(APIPrefix + "/config/replicate").ReadBodyAsJSON(&resp)
	return
}

type GetStoresResponseStoreLabel struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

type GetStoresResponseStore struct {
	Address        string                        `json:"address"`
	ID             int                           `json:"id"`
	Labels         []GetStoresResponseStoreLabel `json:"labels"`
	StateName      string                        `json:"state_name"`
	Version        string                        `json:"version"`
	StatusAddress  string                        `json:"status_address"`
	GitHash        string                        `json:"git_hash"`
	DeployPath     string                        `json:"deploy_path"`
	StartTimestamp int64                         `json:"start_timestamp"`
}

type GetStoresResponseStoresElem struct {
	Store GetStoresResponseStore `json:"store"`
}

type GetStoresResponse struct {
	Stores []GetStoresResponseStoresElem `json:"stores"`
}

// GetStores returns the content from /stores PD API.
// You must specify the base URL by calling SetDefaultBaseURL() before using this function.
func (api *APIClient) GetStores(ctx context.Context) (resp *GetStoresResponse, err error) {
	_, err = api.LR().SetContext(ctx).Get(APIPrefix + "/stores").ReadBodyAsJSON(&resp)
	return
}
