// Copyright 2023 PingCAP, Inc. Licensed under Apache-2.0.

package endpoint

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"

	"github.com/pingcap/tidb-dashboard/util/client/httpclient"
	"github.com/pingcap/tidb-dashboard/util/client/pdclient"
	"github.com/pingcap/tidb-dashboard/util/client/tidbclient"
	"github.com/pingcap/tidb-dashboard/util/client/tiflashclient"
	"github.com/pingcap/tidb-dashboard/util/client/tikvclient"
	"github.com/pingcap/tidb-dashboard/util/rest"
	"github.com/pingcap/tidb-dashboard/util/topo"
)

// RequestPayload describes how a server-side request should be sent, by describing the API endpoint to send
// and its parameter values. The content of this struct is specified by the user so that it should be carefully
// checked.
type RequestPayload struct {
	API         string            `json:"api_id"`
	Host        string            `json:"host"`
	Port        int               `json:"port"`
	ParamValues map[string]string `json:"param_values"`
}

type HTTPClients struct {
	PDAPIClient         *pdclient.APIClient
	TiDBStatusClient    *tidbclient.StatusClient
	TiKVStatusClient    *tikvclient.StatusClient
	TiFlashStatusClient *tiflashclient.StatusClient
}

func (c HTTPClients) GetHTTPClientByNodeKind(kind topo.Kind) *httpclient.Client {
	switch kind {
	case topo.KindPD:
		if c.PDAPIClient == nil {
			return nil
		}
		return c.PDAPIClient.Client
	case topo.KindTiDB:
		if c.TiDBStatusClient == nil {
			return nil
		}
		return c.TiDBStatusClient.Client
	case topo.KindTiKV:
		if c.TiKVStatusClient == nil {
			return nil
		}
		return c.TiKVStatusClient.Client
	case topo.KindTiFlash:
		if c.TiFlashStatusClient == nil {
			return nil
		}
		return c.TiFlashStatusClient.Client
	default:
		return nil
	}
}

// RequestPayloadResolver resolves the request payload using specified API definitions.
//
// The relationship is below:
// 	 RequestPayload ---(RequestPayloadResolver.ResolvePayload)---> ResolvedRequestPayload
type RequestPayloadResolver struct {
	apis       []APIDefinition
	apiMapByID map[string]*APIDefinition
}

func NewRequestPayloadResolver(apis []APIDefinition, acceptedClients HTTPClients) *RequestPayloadResolver {
	// Filter APIs by accepted clients
	filteredAPIs := make([]APIDefinition, 0, len(apis))
	for _, api := range apis {
		httpClient := acceptedClients.GetHTTPClientByNodeKind(api.Component)
		if httpClient != nil {
			filteredAPIs = append(filteredAPIs, api)
		}
	}

	apiMapByID := make(map[string]*APIDefinition)
	for idx := range filteredAPIs {
		api := &filteredAPIs[idx]
		apiMapByID[api.ID] = api
	}
	return &RequestPayloadResolver{
		apis:       filteredAPIs,
		apiMapByID: apiMapByID,
	}
}

func (r *RequestPayloadResolver) ListAPIs() []APIDefinition {
	return r.apis
}

var pathReplaceRegexp = regexp.MustCompile(`\{(\w+)\}`)

func (r *RequestPayloadResolver) ResolvePayload(payload RequestPayload) (*ResolvedRequestPayload, error) {
	if payload.ParamValues == nil {
		// let's make life easier
		payload.ParamValues = make(map[string]string)
	}

	api, ok := r.apiMapByID[payload.API]
	if !ok {
		return nil, rest.ErrBadRequest.New("Unknown API endpoint '%s'", payload.API)
	}

	// TODO: Verify host and port

	resolvedPayload := &ResolvedRequestPayload{
		api:         api,
		host:        payload.Host,
		port:        payload.Port,
		path:        "", // will be filled later
		queryValues: url.Values{},
	}

	// Resolve path
	pathValues := map[string]string{}
	for _, pathParam := range api.PathParams {
		// path param should always be required
		if payload.ParamValues[pathParam.Name] == "" {
			return nil, rest.ErrBadRequest.New("parameter '%s' is required", pathParam.Name)
		}

		resolvedValue, err := pathParam.Resolve(payload.ParamValues[pathParam.Name])
		if err != nil {
			return nil, rest.ErrBadRequest.Wrap(err, "parameter '%s' is invalid", pathParam.Name)
		}

		pathValues[pathParam.Name] = resolvedValue[0]
	}
	resolvedPayload.path = pathReplaceRegexp.ReplaceAllStringFunc(api.Path, func(s string) string {
		key := pathReplaceRegexp.ReplaceAllString(s, "${1}")
		val := url.PathEscape(pathValues[key])
		return val
	})

	// Resolve query
	for _, queryParam := range api.QueryParams {
		if payload.ParamValues[queryParam.Name] == "" {
			if queryParam.Required {
				return nil, rest.ErrBadRequest.New("parameter '%s' is required", queryParam.Name)
			}
			continue
		}

		resolvedValue, err := queryParam.Resolve(payload.ParamValues[queryParam.Name])
		if err != nil {
			return nil, rest.ErrBadRequest.Wrap(err, "parameter '%s' is invalid", queryParam.Name)
		}

		resolvedPayload.queryValues[queryParam.Name] = resolvedValue
	}

	return resolvedPayload, nil
}

// ResolvedRequestPayload describes the final request to send by the server.
// It is constructed by from the RequestPayload and the corresponding APIDefinition.
type ResolvedRequestPayload struct {
	api         *APIDefinition
	host        string
	port        int
	path        string
	queryValues url.Values
}

func (p *ResolvedRequestPayload) SendRequestAndPipe(clientsToUse HTTPClients, w io.Writer) (respNoBody *http.Response, err error) {
	httpClient := clientsToUse.GetHTTPClientByNodeKind(p.api.Component)
	if httpClient == nil {
		return nil, ErrUnknownComponent.New("Unknown component '%s'", p.api.Component)
	}
	req := httpClient.LR().
		SetDebugTag("origin:debug_api").
		SetTLSAwareBaseURL(fmt.Sprintf("http://%s:%d", p.host, p.port)).
		SetMethod(p.api.Method).
		SetURL(p.path).
		SetQueryParamsFromValues(p.queryValues)
	if p.api.BeforeSendRequest != nil {
		p.api.BeforeSendRequest(req)
	}
	resp := req.Send()
	_, respNoBody, err = resp.PipeBody(w)
	return
}
