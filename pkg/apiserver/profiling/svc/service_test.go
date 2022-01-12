// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package svc

import (
	"archive/zip"
	"bytes"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"testing"
	"time"

	"github.com/joomcode/errorx"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/profiling/profutil"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/profiling/svc/model"
	"github.com/pingcap/tidb-dashboard/util/rest"
	"github.com/pingcap/tidb-dashboard/util/testutil/gintest"
	"github.com/pingcap/tidb-dashboard/util/topo"
)

func TestService_StartBundle(t *testing.T) {
	mb := new(model.MockBackend)
	mb.
		On("StartBundle", mock.Anything).
		Return(model.StartBundleResp{BundleID: 5}, nil)
	service := NewService(mb)

	c, r := gintest.CtxPost(nil, `abc`)
	service.StartBundle(c)
	require.Len(t, c.Errors, 1)
	require.Error(t, c.Errors[0])
	require.True(t, errorx.IsOfType(c.Errors[0].Err, rest.ErrBadRequest))
	require.Empty(t, r.Body.Bytes())

	c, r = gintest.CtxPost(nil, `{"targets":[],"kinds":["cpu"]}`)
	service.StartBundle(c)
	require.Len(t, c.Errors, 1)
	require.Contains(t, c.Errors[0].Error(), "Expect at least 1 target")
	require.True(t, errorx.IsOfType(c.Errors[0].Err, rest.ErrBadRequest))
	require.Empty(t, r.Body.Bytes())

	c, r = gintest.CtxPost(nil, `{"targets":[{"signature":"foo"},{"signature":"bar"}],"kinds":[]}`)
	service.StartBundle(c)
	require.Len(t, c.Errors, 1)
	require.Contains(t, c.Errors[0].Error(), "Expect at least 1 profiling kind")
	require.True(t, errorx.IsOfType(c.Errors[0].Err, rest.ErrBadRequest))
	require.Empty(t, r.Body.Bytes())

	c, r = gintest.CtxPost(nil, `{"targets":[{"signature":"foo"},{"signature":"bar"}],"kinds":["cpu"]}`)
	service.StartBundle(c)
	require.Empty(t, c.Errors)
	require.Equal(t, http.StatusOK, r.Code)
	require.JSONEq(t, `{"bundle_id":5}`, r.Body.String())

	c, r = gintest.CtxPost(nil, `{"targets":[{"signature":"foo"},{"signature":"bar"}],"kinds":["xyz"]}`)
	service.StartBundle(c)
	require.Len(t, c.Errors, 1)
	require.Contains(t, c.Errors[0].Error(), "Unsupported profiling kind xyz")
	require.True(t, errorx.IsOfType(c.Errors[0].Err, rest.ErrBadRequest))
	require.Empty(t, r.Body.Bytes())

	mb.AssertExpectations(t)
}

func TestService_DownloadBundleData(t *testing.T) {
	mb := new(model.MockBackend)
	service := NewService(mb)

	c, r := gintest.CtxPost(nil, `abc`)
	service.GetTokenForBundleData(c)
	require.Len(t, c.Errors, 1)
	require.Error(t, c.Errors[0])
	require.True(t, errorx.IsOfType(c.Errors[0].Err, rest.ErrBadRequest))
	require.Empty(t, r.Body.Bytes())

	c, r = gintest.CtxPost(nil, `{"bundle_id":58}`)
	service.GetTokenForBundleData(c)
	require.Empty(t, c.Errors)
	require.Equal(t, http.StatusOK, r.Code)
	token := r.Body.String() // save a correct token for later tests
	require.NotEmpty(t, token)

	c, r = gintest.CtxGet(nil)
	service.DownloadBundleData(c)
	require.Len(t, c.Errors, 1)
	require.Contains(t, c.Errors[0].Error(), "download token is invalid")
	require.True(t, errorx.IsOfType(c.Errors[0].Err, rest.ErrBadRequest))
	require.Empty(t, r.Body.Bytes())

	c, r = gintest.CtxGet(url.Values{"token": []string{"invalid"}})
	service.DownloadBundleData(c)
	require.Len(t, c.Errors, 1)
	require.Contains(t, c.Errors[0].Error(), "download token is invalid")
	require.True(t, errorx.IsOfType(c.Errors[0].Err, rest.ErrBadRequest))
	require.Empty(t, r.Body.Bytes())

	mb.
		On("GetBundleData", mock.MatchedBy(func(req model.GetBundleDataReq) bool {
			return req.BundleID == 58
		})).
		Return(model.GetBundleDataResp{
			Profiles: []model.ProfileWithData{
				{
					Profile: model.Profile{
						ProfileID: 5,
						State:     model.ProfileStateSkipped,
					},
					Data: []byte("data"),
				},
				{
					Profile: model.Profile{
						ProfileID: 1,
						State:     model.ProfileStateSucceeded,
						Target: topo.CompDesc{
							IP:         "example-tidb.internal",
							Port:       4000,
							StatusPort: 12345,
							Kind:       topo.KindTiDB,
						},
						Kind:     profutil.ProfKindMutex,
						StartAt:  time.Unix(1641720252, 0),
						Progress: 1,
						DataType: profutil.ProfDataTypeText,
					},
					Data: []byte("sample mutex output"),
				},
				{
					Profile: model.Profile{
						ProfileID: 7,
						State:     model.ProfileStateSucceeded,
						Kind:      profutil.ProfKindCPU,
						StartAt:   time.Unix(1641720252, 0),
						Progress:  1,
						DataType:  profutil.ProfDataTypeProtobuf,
					},
					Data: nil,
				},
			},
		}, nil).
		On("GetBundleData", mock.Anything).
		Return(model.GetBundleDataResp{}, fmt.Errorf("not found"))

	c, r = gintest.CtxGet(url.Values{"token": []string{token}})
	service.DownloadBundleData(c)
	require.Empty(t, c.Errors)
	require.NotEmpty(t, r.Body.Bytes())

	// Verify zip content
	reader := bytes.NewReader(r.Body.Bytes())
	zr, err := zip.NewReader(reader, int64(reader.Len()))
	require.NoError(t, err)
	require.Len(t, zr.File, 2)
	// File 1
	require.Equal(t, "mutex_tidb_example-tidb_internal_4000_2022_01_09_09_24_12.txt", zr.File[0].Name)
	fh, err := zr.File[0].Open()
	require.NoError(t, err)
	fc, err := ioutil.ReadAll(fh)
	require.NoError(t, err)
	require.Equal(t, []byte("sample mutex output"), fc)
	// File 2
	require.Equal(t, "README.md", zr.File[1].Name)

	// Generate another token that points to a non-existed record,
	// and then use the new token for downloading
	c, r = gintest.CtxPost(nil, `{"bundle_id":999}`)
	service.GetTokenForBundleData(c)
	require.Empty(t, c.Errors)
	require.Equal(t, http.StatusOK, r.Code)
	token2 := r.Body.String()
	require.NotEmpty(t, token2)

	c, r = gintest.CtxGet(url.Values{"token": []string{token2}})
	service.DownloadBundleData(c)
	require.Len(t, c.Errors, 1)
	require.EqualError(t, c.Errors[0].Err, "not found")
	require.Empty(t, r.Body.Bytes())

	mb.AssertExpectations(t)
}

func TestService_RenderProfileData(t *testing.T) {
	mb := new(model.MockBackend)
	service := NewService(mb)

	c, r := gintest.CtxPost(nil, `abc`)
	service.GetTokenForProfileData(c)
	require.Len(t, c.Errors, 1)
	require.Error(t, c.Errors[0])
	require.True(t, errorx.IsOfType(c.Errors[0].Err, rest.ErrBadRequest))
	require.Empty(t, r.Body.Bytes())

	c, r = gintest.CtxPost(nil, `{"profile_id":5}`)
	service.GetTokenForProfileData(c)
	require.Empty(t, c.Errors)
	require.Equal(t, http.StatusOK, r.Code)
	require.NotEmpty(t, r.Body.String())

	c, r = gintest.CtxGet(nil)
	service.RenderProfileData(c)
	require.Len(t, c.Errors, 1)
	require.Contains(t, c.Errors[0].Error(), "download token is invalid")
	require.True(t, errorx.IsOfType(c.Errors[0].Err, rest.ErrBadRequest))
	require.Empty(t, r.Body.Bytes())

	c, r = gintest.CtxGet(url.Values{"token": []string{"invalid"}})
	service.RenderProfileData(c)
	require.Len(t, c.Errors, 1)
	require.Contains(t, c.Errors[0].Error(), "download token is invalid")
	require.True(t, errorx.IsOfType(c.Errors[0].Err, rest.ErrBadRequest))
	require.Empty(t, r.Body.Bytes())

	// use a token generated from GetTokenForBundleData
	c, r = gintest.CtxPost(nil, `{"bundle_id":58}`)
	service.GetTokenForBundleData(c)
	require.Empty(t, c.Errors)
	tokenBundleData := r.Body.String()
	require.NotEmpty(t, tokenBundleData)
	c, r = gintest.CtxGet(url.Values{"token": []string{tokenBundleData}})
	service.RenderProfileData(c)
	require.Len(t, c.Errors, 1)
	require.Contains(t, c.Errors[0].Error(), "download token is invalid")
	require.True(t, errorx.IsOfType(c.Errors[0].Err, rest.ErrBadRequest))
	require.Empty(t, r.Body.Bytes())

	mb.
		On("GetProfileData", mock.MatchedBy(func(req model.GetProfileDataReq) bool {
			return req.ProfileID == 42
		})).
		Return(model.GetProfileDataResp{
			Profile: model.ProfileWithData{
				Profile: model.Profile{
					ProfileID: 42,
					State:     model.ProfileStateSkipped,
				},
				Data: []byte("data"),
			},
		}, nil).
		On("GetProfileData", mock.MatchedBy(func(req model.GetProfileDataReq) bool {
			return req.ProfileID == 54
		})).
		Return(model.GetProfileDataResp{
			Profile: model.ProfileWithData{
				Profile: model.Profile{
					ProfileID: 54,
					State:     model.ProfileStateSucceeded,
					Target: topo.CompDesc{
						IP:         "example-tidb.internal",
						Port:       4000,
						StatusPort: 12345,
						Kind:       topo.KindTiDB,
					},
					Kind:     profutil.ProfKindCPU,
					StartAt:  time.Unix(1641720231, 0),
					Progress: 1,
					DataType: profutil.ProfDataTypeProtobuf,
				},
				Data: []byte{0x1, 0x2, 0x3},
			},
		}, nil).
		On("GetProfileData", mock.MatchedBy(func(req model.GetProfileDataReq) bool {
			return req.ProfileID == 80
		})).
		Return(model.GetProfileDataResp{
			Profile: model.ProfileWithData{
				Profile: model.Profile{
					ProfileID: 80,
					State:     model.ProfileStateSucceeded,
					Target: topo.CompDesc{
						IP:   "example-pd.internal",
						Port: 2379,
						Kind: topo.KindPD,
					},
					Kind:     profutil.ProfKindGoroutine,
					StartAt:  time.Unix(1641720231, 0),
					Progress: 1,
					DataType: profutil.ProfDataTypeText,
				},
				Data: []byte("goroutine data"),
			},
		}, nil).
		On("GetProfileData", mock.Anything).
		Return(model.GetProfileDataResp{}, fmt.Errorf("not found"))

	// Test backend returns error
	c, r = gintest.CtxPost(nil, `{"profile_id":1}`)
	service.GetTokenForProfileData(c)
	require.Empty(t, c.Errors)
	token := r.Body.String()
	require.NotEmpty(t, token)
	c, r = gintest.CtxGet(url.Values{"token": []string{token}})
	service.RenderProfileData(c)
	require.Len(t, c.Errors, 1)
	require.Contains(t, c.Errors[0].Error(), "not found")
	require.Empty(t, r.Body.Bytes())

	// Test unsupported render as
	c, r = gintest.CtxPost(nil, `{"profile_id":54, "render_as":"foo"}`)
	service.GetTokenForProfileData(c)
	require.Empty(t, c.Errors)
	token = r.Body.String()
	require.NotEmpty(t, token)
	c, r = gintest.CtxGet(url.Values{"token": []string{token}})
	service.RenderProfileData(c)
	require.Len(t, c.Errors, 1)
	require.Contains(t, c.Errors[0].Error(), "unsupported render type foo")
	require.True(t, errorx.IsOfType(c.Errors[0].Err, rest.ErrBadRequest))
	require.Empty(t, r.Body.Bytes())

	// Test default render as
	c, r = gintest.CtxPost(nil, `{"profile_id":54}`)
	service.GetTokenForProfileData(c)
	require.Empty(t, c.Errors)
	token = r.Body.String()
	require.NotEmpty(t, token)
	c, r = gintest.CtxGet(url.Values{"token": []string{token}})
	service.RenderProfileData(c)
	require.Empty(t, c.Errors)
	require.Equal(t, []byte{0x1, 0x2, 0x3}, r.Body.Bytes())

	// Test invalid profile returned by backend
	c, r = gintest.CtxPost(nil, `{"profile_id":42}`)
	service.GetTokenForProfileData(c)
	require.Empty(t, c.Errors)
	token = r.Body.String()
	require.NotEmpty(t, token)
	c, r = gintest.CtxGet(url.Values{"token": []string{token}})
	service.RenderProfileData(c)
	require.Len(t, c.Errors, 1)
	require.Contains(t, c.Errors[0].Error(), "the profile is not generated successfully")
	require.Empty(t, r.Body.Bytes())

	// Test render as unchanged
	c, r = gintest.CtxPost(nil, `{"profile_id":54, "render_as":"unchanged"}`)
	service.GetTokenForProfileData(c)
	require.Empty(t, c.Errors)
	token = r.Body.String()
	require.NotEmpty(t, token)
	c, r = gintest.CtxGet(url.Values{"token": []string{token}})
	service.RenderProfileData(c)
	require.Empty(t, c.Errors)
	require.Equal(t, []byte{0x1, 0x2, 0x3}, r.Body.Bytes())

	// Test proto -> svg convert failure
	c, r = gintest.CtxPost(nil, `{"profile_id":54, "render_as":"svg_graph"}`)
	service.GetTokenForProfileData(c)
	require.Empty(t, c.Errors)
	token = r.Body.String()
	require.NotEmpty(t, token)
	c, r = gintest.CtxGet(url.Values{"token": []string{token}})
	service.RenderProfileData(c)
	require.Len(t, c.Errors, 1)
	require.Contains(t, c.Errors[0].Error(), "failed to generate dot file")
	require.Empty(t, r.Body.Bytes())

	// Test raw data type is text
	c, r = gintest.CtxPost(nil, `{"profile_id":80}`)
	service.GetTokenForProfileData(c)
	require.Empty(t, c.Errors)
	token = r.Body.String()
	require.NotEmpty(t, token)
	c, r = gintest.CtxGet(url.Values{"token": []string{token}})
	service.RenderProfileData(c)
	require.Empty(t, c.Errors)
	require.Equal(t, []byte("goroutine data"), r.Body.Bytes())

	// Test text -> svg
	c, r = gintest.CtxPost(nil, `{"profile_id":80, "render_as":"svg_graph"}`)
	service.GetTokenForProfileData(c)
	require.Empty(t, c.Errors)
	token = r.Body.String()
	require.NotEmpty(t, token)
	c, r = gintest.CtxGet(url.Values{"token": []string{token}})
	service.RenderProfileData(c)
	require.Len(t, c.Errors, 1)
	require.Contains(t, c.Errors[0].Error(), "cannot render text as svg_graph")
	require.True(t, errorx.IsOfType(c.Errors[0].Err, rest.ErrBadRequest))
	require.Empty(t, r.Body.Bytes())

	mb.AssertExpectations(t)
}
