// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package view

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
	"github.com/pingcap/tidb-dashboard/util/rest"
	"github.com/pingcap/tidb-dashboard/util/testutil/gintest"
	"github.com/pingcap/tidb-dashboard/util/topo"
)

func TestView_StartBundle(t *testing.T) {
	mm := new(MockModel)
	mm.
		On("StartBundle", mock.Anything).
		Return(StartBundleResp{BundleID: 5}, nil)
	view := NewView(mm)

	c, r := gintest.CtxPost(nil, `abc`)
	view.StartBundle(c)
	require.Len(t, c.Errors, 1)
	require.Error(t, c.Errors[0])
	require.True(t, errorx.IsOfType(c.Errors[0].Err, rest.ErrBadRequest))
	require.Empty(t, r.Body.Bytes())

	c, r = gintest.CtxPost(nil, `{"targets":[],"kinds":["cpu"]}`)
	view.StartBundle(c)
	require.Len(t, c.Errors, 1)
	require.Contains(t, c.Errors[0].Error(), "Expect at least 1 target")
	require.True(t, errorx.IsOfType(c.Errors[0].Err, rest.ErrBadRequest))
	require.Empty(t, r.Body.Bytes())

	c, r = gintest.CtxPost(nil, `{"targets":[{"signature":"foo"},{"signature":"bar"}],"kinds":[]}`)
	view.StartBundle(c)
	require.Len(t, c.Errors, 1)
	require.Contains(t, c.Errors[0].Error(), "Expect at least 1 profiling kind")
	require.True(t, errorx.IsOfType(c.Errors[0].Err, rest.ErrBadRequest))
	require.Empty(t, r.Body.Bytes())

	c, r = gintest.CtxPost(nil, `{"targets":[{"signature":"foo"},{"signature":"bar"}],"kinds":["cpu"]}`)
	view.StartBundle(c)
	require.Empty(t, c.Errors)
	require.Equal(t, http.StatusOK, r.Code)
	require.JSONEq(t, `{"bundle_id":5}`, r.Body.String())

	c, r = gintest.CtxPost(nil, `{"targets":[{"signature":"foo"},{"signature":"bar"}],"kinds":["xyz"]}`)
	view.StartBundle(c)
	require.Len(t, c.Errors, 1)
	require.Contains(t, c.Errors[0].Error(), "Unsupported profiling kind xyz")
	require.True(t, errorx.IsOfType(c.Errors[0].Err, rest.ErrBadRequest))
	require.Empty(t, r.Body.Bytes())

	mm.AssertExpectations(t)
}

func TestView_DownloadBundleData(t *testing.T) {
	mm := new(MockModel)
	view := NewView(mm)

	c, r := gintest.CtxPost(nil, `abc`)
	view.GetTokenForBundleData(c)
	require.Len(t, c.Errors, 1)
	require.Error(t, c.Errors[0])
	require.True(t, errorx.IsOfType(c.Errors[0].Err, rest.ErrBadRequest))
	require.Empty(t, r.Body.Bytes())

	c, r = gintest.CtxPost(nil, `{"bundle_id":58}`)
	view.GetTokenForBundleData(c)
	require.Empty(t, c.Errors)
	require.Equal(t, http.StatusOK, r.Code)
	token := r.Body.String() // save a correct token for later tests
	require.NotEmpty(t, token)

	c, r = gintest.CtxGet(nil)
	view.DownloadBundleData(c)
	require.Len(t, c.Errors, 1)
	require.Contains(t, c.Errors[0].Error(), "download token is invalid")
	require.True(t, errorx.IsOfType(c.Errors[0].Err, rest.ErrBadRequest))
	require.Empty(t, r.Body.Bytes())

	c, r = gintest.CtxGet(url.Values{"token": []string{"invalid"}})
	view.DownloadBundleData(c)
	require.Len(t, c.Errors, 1)
	require.Contains(t, c.Errors[0].Error(), "download token is invalid")
	require.True(t, errorx.IsOfType(c.Errors[0].Err, rest.ErrBadRequest))
	require.Empty(t, r.Body.Bytes())

	mm.
		On("GetBundleData", mock.MatchedBy(func(req GetBundleDataReq) bool {
			return req.BundleID == 58
		})).
		Return(GetBundleDataResp{
			Profiles: []ProfileWithData{
				{
					Profile: Profile{
						ProfileID: 5,
						State:     ProfileStateSkipped,
					},
					Data: []byte("data"),
				},
				{
					Profile: Profile{
						ProfileID: 1,
						State:     ProfileStateSucceeded,
						Target: topo.CompDescriptor{
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
					Profile: Profile{
						ProfileID: 7,
						State:     ProfileStateSucceeded,
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
		Return(GetBundleDataResp{}, fmt.Errorf("not found"))

	c, r = gintest.CtxGet(url.Values{"token": []string{token}})
	view.DownloadBundleData(c)
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
	view.GetTokenForBundleData(c)
	require.Empty(t, c.Errors)
	require.Equal(t, http.StatusOK, r.Code)
	token2 := r.Body.String()
	require.NotEmpty(t, token2)

	c, r = gintest.CtxGet(url.Values{"token": []string{token2}})
	view.DownloadBundleData(c)
	require.Len(t, c.Errors, 1)
	require.EqualError(t, c.Errors[0].Err, "not found")
	require.Empty(t, r.Body.Bytes())

	mm.AssertExpectations(t)
}

func TestView_RenderProfileData(t *testing.T) {
	mm := new(MockModel)
	view := NewView(mm)

	c, r := gintest.CtxPost(nil, `abc`)
	view.GetTokenForProfileData(c)
	require.Len(t, c.Errors, 1)
	require.Error(t, c.Errors[0])
	require.True(t, errorx.IsOfType(c.Errors[0].Err, rest.ErrBadRequest))
	require.Empty(t, r.Body.Bytes())

	c, r = gintest.CtxPost(nil, `{"profile_id":5}`)
	view.GetTokenForProfileData(c)
	require.Empty(t, c.Errors)
	require.Equal(t, http.StatusOK, r.Code)
	require.NotEmpty(t, r.Body.String())

	c, r = gintest.CtxGet(nil)
	view.RenderProfileData(c)
	require.Len(t, c.Errors, 1)
	require.Contains(t, c.Errors[0].Error(), "download token is invalid")
	require.True(t, errorx.IsOfType(c.Errors[0].Err, rest.ErrBadRequest))
	require.Empty(t, r.Body.Bytes())

	c, r = gintest.CtxGet(url.Values{"token": []string{"invalid"}})
	view.RenderProfileData(c)
	require.Len(t, c.Errors, 1)
	require.Contains(t, c.Errors[0].Error(), "download token is invalid")
	require.True(t, errorx.IsOfType(c.Errors[0].Err, rest.ErrBadRequest))
	require.Empty(t, r.Body.Bytes())

	// use a token generated from GetTokenForBundleData
	c, r = gintest.CtxPost(nil, `{"bundle_id":58}`)
	view.GetTokenForBundleData(c)
	require.Empty(t, c.Errors)
	tokenBundleData := r.Body.String()
	require.NotEmpty(t, tokenBundleData)
	c, r = gintest.CtxGet(url.Values{"token": []string{tokenBundleData}})
	view.RenderProfileData(c)
	require.Len(t, c.Errors, 1)
	require.Contains(t, c.Errors[0].Error(), "download token is invalid")
	require.True(t, errorx.IsOfType(c.Errors[0].Err, rest.ErrBadRequest))
	require.Empty(t, r.Body.Bytes())

	mm.
		On("GetProfileData", mock.MatchedBy(func(req GetProfileDataReq) bool {
			return req.ProfileID == 42
		})).
		Return(GetProfileDataResp{
			Profile: ProfileWithData{
				Profile: Profile{
					ProfileID: 42,
					State:     ProfileStateSkipped,
				},
				Data: []byte("data"),
			},
		}, nil).
		On("GetProfileData", mock.MatchedBy(func(req GetProfileDataReq) bool {
			return req.ProfileID == 54
		})).
		Return(GetProfileDataResp{
			Profile: ProfileWithData{
				Profile: Profile{
					ProfileID: 54,
					State:     ProfileStateSucceeded,
					Target: topo.CompDescriptor{
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
		On("GetProfileData", mock.MatchedBy(func(req GetProfileDataReq) bool {
			return req.ProfileID == 80
		})).
		Return(GetProfileDataResp{
			Profile: ProfileWithData{
				Profile: Profile{
					ProfileID: 80,
					State:     ProfileStateSucceeded,
					Target: topo.CompDescriptor{
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
		Return(GetProfileDataResp{}, fmt.Errorf("not found"))

	// Test model returns error
	c, r = gintest.CtxPost(nil, `{"profile_id":1}`)
	view.GetTokenForProfileData(c)
	require.Empty(t, c.Errors)
	token := r.Body.String()
	require.NotEmpty(t, token)
	c, r = gintest.CtxGet(url.Values{"token": []string{token}})
	view.RenderProfileData(c)
	require.Len(t, c.Errors, 1)
	require.Contains(t, c.Errors[0].Error(), "not found")
	require.Empty(t, r.Body.Bytes())

	// Test unsupported render as
	c, r = gintest.CtxPost(nil, `{"profile_id":54, "render_as":"foo"}`)
	view.GetTokenForProfileData(c)
	require.Empty(t, c.Errors)
	token = r.Body.String()
	require.NotEmpty(t, token)
	c, r = gintest.CtxGet(url.Values{"token": []string{token}})
	view.RenderProfileData(c)
	require.Len(t, c.Errors, 1)
	require.Contains(t, c.Errors[0].Error(), "unsupported render type foo")
	require.True(t, errorx.IsOfType(c.Errors[0].Err, rest.ErrBadRequest))
	require.Empty(t, r.Body.Bytes())

	// Test default render as
	c, r = gintest.CtxPost(nil, `{"profile_id":54}`)
	view.GetTokenForProfileData(c)
	require.Empty(t, c.Errors)
	token = r.Body.String()
	require.NotEmpty(t, token)
	c, r = gintest.CtxGet(url.Values{"token": []string{token}})
	view.RenderProfileData(c)
	require.Empty(t, c.Errors)
	require.Equal(t, []byte{0x1, 0x2, 0x3}, r.Body.Bytes())

	// Test invalid profile returned by model
	c, r = gintest.CtxPost(nil, `{"profile_id":42}`)
	view.GetTokenForProfileData(c)
	require.Empty(t, c.Errors)
	token = r.Body.String()
	require.NotEmpty(t, token)
	c, r = gintest.CtxGet(url.Values{"token": []string{token}})
	view.RenderProfileData(c)
	require.Len(t, c.Errors, 1)
	require.Contains(t, c.Errors[0].Error(), "the profile is not generated successfully")
	require.Empty(t, r.Body.Bytes())

	// Test render as unchanged
	c, r = gintest.CtxPost(nil, `{"profile_id":54, "render_as":"unchanged"}`)
	view.GetTokenForProfileData(c)
	require.Empty(t, c.Errors)
	token = r.Body.String()
	require.NotEmpty(t, token)
	c, r = gintest.CtxGet(url.Values{"token": []string{token}})
	view.RenderProfileData(c)
	require.Empty(t, c.Errors)
	require.Equal(t, []byte{0x1, 0x2, 0x3}, r.Body.Bytes())

	// Test proto -> svg convert failure
	c, r = gintest.CtxPost(nil, `{"profile_id":54, "render_as":"svg_graph"}`)
	view.GetTokenForProfileData(c)
	require.Empty(t, c.Errors)
	token = r.Body.String()
	require.NotEmpty(t, token)
	c, r = gintest.CtxGet(url.Values{"token": []string{token}})
	view.RenderProfileData(c)
	require.Len(t, c.Errors, 1)
	require.Contains(t, c.Errors[0].Error(), "failed to generate dot file")
	require.Empty(t, r.Body.Bytes())

	// Test raw data type is text
	c, r = gintest.CtxPost(nil, `{"profile_id":80}`)
	view.GetTokenForProfileData(c)
	require.Empty(t, c.Errors)
	token = r.Body.String()
	require.NotEmpty(t, token)
	c, r = gintest.CtxGet(url.Values{"token": []string{token}})
	view.RenderProfileData(c)
	require.Empty(t, c.Errors)
	require.Equal(t, []byte("goroutine data"), r.Body.Bytes())

	// Test text -> svg
	c, r = gintest.CtxPost(nil, `{"profile_id":80, "render_as":"svg_graph"}`)
	view.GetTokenForProfileData(c)
	require.Empty(t, c.Errors)
	token = r.Body.String()
	require.NotEmpty(t, token)
	c, r = gintest.CtxGet(url.Values{"token": []string{token}})
	view.RenderProfileData(c)
	require.Len(t, c.Errors, 1)
	require.Contains(t, c.Errors[0].Error(), "cannot render text as svg_graph")
	require.True(t, errorx.IsOfType(c.Errors[0].Err, rest.ErrBadRequest))
	require.Empty(t, r.Body.Bytes())

	mm.AssertExpectations(t)
}
