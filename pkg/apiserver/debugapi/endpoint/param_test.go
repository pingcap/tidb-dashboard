// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package endpoint

import (
	"io/ioutil"
	"net/http"
	"testing"

	. "github.com/pingcap/check"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
)

func TestParam(t *testing.T) {
	CustomVerboseFlag = true
	TestingT(t)
}

var _ = Suite(&testParamSuite{})

type testParamSuite struct{}

func (t *testParamSuite) Test_Resolve(c *C) {
	testParamModel := &BaseAPIParamModel{
		Type: "test",
		OnResolve: func(value string) ([]string, error) {
			return []string{"test"}, nil
		},
	}
	client := NewClient(&testFetcher{}, []*APIModel{
		{
			ID:        "test_endpoint",
			Component: model.NodeKindTiDB,
			Path:      "/test/{pathParam}",
			Method:    http.MethodGet,
			PathParams: []*APIParam{
				{Model: testParamModel, Name: "pathParam", Required: true},
			},
			QueryParams: []*APIParam{
				{Model: testParamModel, Name: "queryParam", Required: true},
			},
		},
	})
	resp, err := client.Send(&RequestPayload{
		testAPI.ID,
		"127.0.0.1",
		10080,
		map[string]string{
			"pathParam":  "foo",
			"queryParam": "bar",
		},
	})
	if err != nil {
		c.Error(err)
	}
	data, _ := ioutil.ReadAll(resp.RawBody())
	defer resp.RawBody().Close() //nolint:errcheck

	c.Assert(string(data), Equals, testCombineReq("127.0.0.1", 10080, "/test/test", "queryParam=test"))
}
