// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package profiling

import (
	"fmt"
	"testing"
	"time"

	"github.com/jarcoal/httpmock"
	"github.com/joomcode/errorx"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"github.com/stretchr/testify/suite"
	"go.uber.org/fx/fxtest"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/profiling/profutil"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/profiling/svc/model"
	"github.com/pingcap/tidb-dashboard/pkg/dbstore"
	"github.com/pingcap/tidb-dashboard/util/client/httpclient"
	"github.com/pingcap/tidb-dashboard/util/client/pdclient"
	"github.com/pingcap/tidb-dashboard/util/client/tidbclient"
	"github.com/pingcap/tidb-dashboard/util/client/tikvclient"
	"github.com/pingcap/tidb-dashboard/util/clientbundle"
	"github.com/pingcap/tidb-dashboard/util/rest"
	"github.com/pingcap/tidb-dashboard/util/testutil/httpmockutil"
	"github.com/pingcap/tidb-dashboard/util/topo"
)

type BackendSuite struct {
	suite.Suite

	db        *dbstore.DB
	lifecycle *fxtest.Lifecycle
	backend   *StandardBackend
	signer    topo.CompDescSigner

	mockTopoProvider  *topo.MockTopologyProvider
	mockTiDBTransport *httpmock.MockTransport
	mockPDTransport   *httpmock.MockTransport
	mockTiKVTransport *httpmock.MockTransport
}

// Turn array into the map for easier testing.
func mapProfilesByIPAndKind(profiles []model.Profile) map[string]model.Profile {
	profilesByIPAndKind := map[string]model.Profile{}
	for _, profile := range profiles {
		key := fmt.Sprintf("%s_%s", profile.Kind, profile.Target.IP)
		profilesByIPAndKind[key] = profile
	}
	return profilesByIPAndKind
}

// Turn array into the map for easier testing.
func mapProfilesDataByIPAndKind(profiles []model.ProfileWithData) map[string]model.ProfileWithData {
	profilesByIPAndKind := map[string]model.ProfileWithData{}
	for _, profile := range profiles {
		key := fmt.Sprintf("%s_%s", profile.Kind, profile.Target.IP)
		profilesByIPAndKind[key] = profile
	}
	return profilesByIPAndKind
}

func (suite *BackendSuite) SetupTest() {
	db, err := dbstore.NewMemoryDBStore()
	require.NoError(suite.T(), err)
	suite.db = db

	suite.lifecycle = fxtest.NewLifecycle(suite.T())

	suite.mockTiDBTransport = httpmock.NewMockTransport()
	tidbClient := tidbclient.NewStatusClient(httpclient.Config{})
	tidbClient.SetDefaultTransport(suite.mockTiDBTransport)

	suite.mockPDTransport = httpmock.NewMockTransport()
	pdAPIClient := pdclient.NewAPIClient(httpclient.Config{})
	pdAPIClient.SetDefaultTransport(suite.mockPDTransport)

	suite.mockTiKVTransport = httpmock.NewMockTransport()
	tikvClient := tikvclient.NewStatusClient(httpclient.Config{})
	tikvClient.SetDefaultTransport(suite.mockTiKVTransport)

	suite.mockTopoProvider = new(topo.MockTopologyProvider)

	suite.signer = topo.NewHS256CompDescSigner()

	suite.backend = NewStandardBackend(suite.lifecycle, Params{
		LocalStore:   db,
		TopoProvider: suite.mockTopoProvider,
		CompSigner:   suite.signer,
	}, clientbundle.HTTPClientBundle{
		PDAPIClient:      pdAPIClient,
		TiDBStatusClient: tidbClient,
		TiKVStatusClient: tikvClient,
	}).(*StandardBackend)

	suite.lifecycle.RequireStart()
}

func (suite *BackendSuite) TearDownTest() {
	suite.lifecycle.RequireStop()
	suite.db.MustClose()
}

func (suite *BackendSuite) mustSignDesc(i topo.CompDesc) topo.SignedCompDesc {
	r, err := suite.signer.Sign(&i)
	suite.Require().NoError(err)
	return r
}

func (suite *BackendSuite) TestListTargets() {
	suite.mockTopoProvider.
		On("GetPD", mock.Anything).
		Return([]topo.PDInfo{
			{
				IP:   "pd-1.internal",
				Port: 2379,
			},
			{
				IP:   "pd-2.internal",
				Port: 1414,
			},
		}, nil).
		On("GetTiDB", mock.Anything).
		Return([]topo.TiDBInfo{}, nil).
		On("GetTiKV", mock.Anything).
		Return([]topo.TiKVStoreInfo{}, nil).
		On("GetTiFlash", mock.Anything).
		Return([]topo.TiFlashStoreInfo{}, nil)

	targets, err := suite.backend.ListTargets()
	suite.Require().NoError(err)
	suite.Require().Len(targets.Targets, 2)
	suite.Require().NotEmpty(targets.Targets[0].SignedDescriptor.Signature)
	suite.Require().Equal("pd-1.internal", targets.Targets[0].SignedDescriptor.IP)
	suite.Require().NoError(suite.signer.Verify(&targets.Targets[0].SignedDescriptor))
	suite.Require().NotEmpty(targets.Targets[1].SignedDescriptor.Signature)
	suite.Require().Equal("pd-2.internal", targets.Targets[1].SignedDescriptor.IP)
	suite.Require().NoError(suite.signer.Verify(&targets.Targets[1].SignedDescriptor))

	suite.mockTopoProvider.AssertExpectations(suite.T())
}

func (suite *BackendSuite) TestStartNotSigned() {
	_, err := suite.backend.StartBundle(model.StartBundleReq{
		DurationSec: 10,
		Kinds: []profutil.ProfKind{
			profutil.ProfKindCPU,
		},
		Targets: []topo.SignedCompDesc{
			{
				CompDesc: topo.CompDesc{
					IP:         "tiflash-1.internal",
					Port:       1234,
					StatusPort: 5678,
					Kind:       topo.KindTiFlash,
				},
				Signature: "invalid signature",
			},
		},
	})
	suite.Require().Error(err)
	suite.Require().Contains(err.Error(), "targets are not valid")
}

func (suite *BackendSuite) TestStartWithoutClient() {
	startResp, err := suite.backend.StartBundle(model.StartBundleReq{
		DurationSec: 10,
		Kinds: []profutil.ProfKind{
			profutil.ProfKindCPU,
		},
		Targets: []topo.SignedCompDesc{
			suite.mustSignDesc(topo.CompDesc{
				IP:         "tiflash-1.internal",
				Port:       1234,
				StatusPort: 5678,
				Kind:       topo.KindTiFlash,
			}),
		},
	})
	suite.Require().NoError(err)

	// Wait bundle task to finish
	suite.backend.bundleTaskWg.Wait()

	// Test GetBundle
	getResp, err := suite.backend.GetBundle(model.GetBundleReq{BundleID: startResp.BundleID})
	suite.Require().NoError(err)
	suite.Require().EqualValues(startResp.BundleID, getResp.Bundle.BundleID)
	suite.Require().Equal(topo.CompCount{topo.KindTiFlash: 1}, getResp.Bundle.TargetsCount)
	suite.Require().Equal(model.BundleStateAllSucceeded, getResp.Bundle.State)
	suite.Require().Len(getResp.Profiles, 1)
	suite.Require().Equal(model.ProfileStateSkipped, getResp.Profiles[0].State) // skipped due to TiDB http client not set
	suite.Require().Equal(topo.CompDesc{
		IP:         "tiflash-1.internal",
		Port:       1234,
		StatusPort: 5678,
		Kind:       topo.KindTiFlash,
	}, getResp.Profiles[0].Target)
	suite.Require().EqualValues(1, getResp.Profiles[0].Progress)
	suite.Require().Empty(getResp.Profiles[0].Error)
	suite.Require().Equal(profutil.ProfKindCPU, getResp.Profiles[0].Kind)

	// Test ListBundles
	listResp, err := suite.backend.ListBundles()
	suite.Require().NoError(err)
	suite.Require().Len(listResp.Bundles, 1)
	suite.Require().Equal(startResp.BundleID, listResp.Bundles[0].BundleID)

	// Test GetBundleData
	bundleDataResp, err := suite.backend.GetBundleData(model.GetBundleDataReq{BundleID: startResp.BundleID})
	suite.Require().NoError(err)
	suite.Require().Empty(bundleDataResp.Profiles)

	// Test GetProfileData
	_, err = suite.backend.GetProfileData(model.GetProfileDataReq{ProfileID: getResp.Profiles[0].ProfileID})
	suite.Require().EqualError(err, "the profile is in skipped state")
}

func (suite *BackendSuite) TestGetBundleNotFound() {
	_, err := suite.backend.GetBundle(model.GetBundleReq{BundleID: 5})
	suite.Require().Error(err)
	suite.Require().True(errorx.IsOfType(err, rest.ErrNotFound))
}

func (suite *BackendSuite) TestListBundlesEmpty() {
	resp, err := suite.backend.ListBundles()
	suite.Require().NoError(err)
	suite.Require().Empty(resp.Bundles)
}

func (suite *BackendSuite) TestGetBundleDataNotFound() {
	resp, err := suite.backend.GetBundleData(model.GetBundleDataReq{BundleID: 5})
	suite.Require().NoError(err)
	suite.Require().Empty(resp.Profiles)
}

func (suite *BackendSuite) TestGetProfileDataNotFound() {
	_, err := suite.backend.GetProfileData(model.GetProfileDataReq{ProfileID: 5})
	suite.Require().Error(err)
	suite.Require().True(errorx.IsOfType(err, rest.ErrNotFound))
}

func (suite *BackendSuite) TestMultipleTargets() {
	startResp, err := suite.backend.StartBundle(model.StartBundleReq{
		DurationSec: 10,
		Kinds: []profutil.ProfKind{
			profutil.ProfKindCPU,
			profutil.ProfKindMutex,
		},
		Targets: []topo.SignedCompDesc{
			suite.mustSignDesc(topo.CompDesc{
				IP:         "tidb-1.internal",
				Port:       4000,
				StatusPort: 10080,
				Kind:       topo.KindTiDB,
			}),
			suite.mustSignDesc(topo.CompDesc{
				IP:         "tidb-2.internal",
				Port:       4000,
				StatusPort: 10080,
				Kind:       topo.KindTiDB,
			}),
			suite.mustSignDesc(topo.CompDesc{
				IP:         "kv-2412.internal",
				Port:       1111,
				StatusPort: 2222,
				Kind:       topo.KindTiKV,
			}),
		},
	})
	suite.Require().NoError(err)

	// Wait bundle task to finish
	suite.backend.bundleTaskWg.Wait()

	getResp, err := suite.backend.GetBundle(model.GetBundleReq{BundleID: startResp.BundleID})
	suite.Require().NoError(err)
	suite.Require().EqualValues(startResp.BundleID, getResp.Bundle.BundleID)
	suite.Require().Equal(topo.CompCount{topo.KindTiDB: 2, topo.KindTiKV: 1}, getResp.Bundle.TargetsCount)
	suite.Require().Equal(model.BundleStatePartialSucceeded, getResp.Bundle.State)
	suite.Require().Equal([]profutil.ProfKind{profutil.ProfKindCPU, profutil.ProfKindMutex}, getResp.Bundle.Kinds)
	suite.Require().Len(getResp.Profiles, 6)
	profiles := mapProfilesByIPAndKind(getResp.Profiles)
	suite.Require().Equal(model.ProfileStateError, profiles[`cpu_tidb-1.internal`].State)
	suite.Require().Equal(model.ProfileStateError, profiles[`cpu_tidb-2.internal`].State)
	suite.Require().Equal(model.ProfileStateError, profiles[`cpu_kv-2412.internal`].State)
	suite.Require().Equal(model.ProfileStateError, profiles[`mutex_tidb-1.internal`].State)
	suite.Require().Equal(model.ProfileStateError, profiles[`mutex_tidb-2.internal`].State)
	suite.Require().Equal(model.ProfileStateSkipped, profiles[`mutex_kv-2412.internal`].State)

	// Test GetBundleData
	bundleDataResp, err := suite.backend.GetBundleData(model.GetBundleDataReq{BundleID: startResp.BundleID})
	suite.Require().NoError(err)
	suite.Require().Empty(bundleDataResp.Profiles)

	// Test GetProfileData
	_, err = suite.backend.GetProfileData(model.GetProfileDataReq{ProfileID: profiles[`cpu_tidb-1.internal`].ProfileID})
	suite.Require().EqualError(err, "the profile is in error state")
}

func (suite *BackendSuite) TestAllFailed() {
	startResp, err := suite.backend.StartBundle(model.StartBundleReq{
		DurationSec: 10,
		Kinds: []profutil.ProfKind{
			profutil.ProfKindCPU,
			profutil.ProfKindMutex,
		},
		Targets: []topo.SignedCompDesc{
			suite.mustSignDesc(topo.CompDesc{
				IP:         "tidb-1.internal",
				Port:       4000,
				StatusPort: 10080,
				Kind:       topo.KindTiDB,
			}),
			suite.mustSignDesc(topo.CompDesc{
				IP:   "pd-4.internal",
				Port: 2379,
				Kind: topo.KindPD,
			}),
		},
	})
	suite.Require().NoError(err)

	// Wait bundle task to finish
	suite.backend.bundleTaskWg.Wait()

	getResp, err := suite.backend.GetBundle(model.GetBundleReq{BundleID: startResp.BundleID})
	suite.Require().NoError(err)
	suite.Require().Equal(topo.CompCount{topo.KindTiDB: 1, topo.KindPD: 1}, getResp.Bundle.TargetsCount)
	suite.Require().Equal(model.BundleStateAllFailed, getResp.Bundle.State)
	suite.Require().Len(getResp.Profiles, 4)
	profiles := mapProfilesByIPAndKind(getResp.Profiles)
	suite.Require().Equal(model.ProfileStateError, profiles[`cpu_tidb-1.internal`].State)
	suite.Require().Equal(model.ProfileStateError, profiles[`cpu_pd-4.internal`].State)
	suite.Require().Equal(model.ProfileStateError, profiles[`mutex_tidb-1.internal`].State)
	suite.Require().Equal(model.ProfileStateError, profiles[`mutex_pd-4.internal`].State)
	suite.Require().Contains(profiles[`cpu_tidb-1.internal`].Error, "no responder found")
	suite.Require().Contains(profiles[`cpu_pd-4.internal`].Error, "no responder found")
	suite.Require().Contains(profiles[`mutex_tidb-1.internal`].Error, "no responder found")
	suite.Require().Contains(profiles[`mutex_pd-4.internal`].Error, "no responder found")

	// Test GetBundleData
	bundleDataResp, err := suite.backend.GetBundleData(model.GetBundleDataReq{BundleID: startResp.BundleID})
	suite.Require().NoError(err)
	suite.Require().Empty(bundleDataResp.Profiles)

	// Test GetProfileData
	_, err = suite.backend.GetProfileData(model.GetProfileDataReq{ProfileID: profiles[`mutex_tidb-1.internal`].ProfileID})
	suite.Require().EqualError(err, "the profile is in error state")
}

func (suite *BackendSuite) TestAllSkipped() {
	startResp, err := suite.backend.StartBundle(model.StartBundleReq{
		DurationSec: 10,
		Kinds: []profutil.ProfKind{
			profutil.ProfKindGoroutine,
			profutil.ProfKindMutex,
		},
		Targets: []topo.SignedCompDesc{
			suite.mustSignDesc(topo.CompDesc{
				IP:         "tikv-1.internal",
				Port:       1414,
				StatusPort: 5050,
				Kind:       topo.KindTiKV,
			}),
			suite.mustSignDesc(topo.CompDesc{
				IP:         "tikv-2.internal",
				Port:       1414,
				StatusPort: 5050,
				Kind:       topo.KindTiKV,
			}),
		},
	})
	suite.Require().NoError(err)

	// Wait bundle task to finish
	suite.backend.bundleTaskWg.Wait()

	getResp, err := suite.backend.GetBundle(model.GetBundleReq{BundleID: startResp.BundleID})
	suite.Require().NoError(err)
	suite.Require().Equal(topo.CompCount{topo.KindTiKV: 2}, getResp.Bundle.TargetsCount)
	suite.Require().Equal(model.BundleStateAllSucceeded, getResp.Bundle.State)
	suite.Require().Len(getResp.Profiles, 4)
	profiles := mapProfilesByIPAndKind(getResp.Profiles)
	suite.Require().Equal(model.ProfileStateSkipped, profiles[`goroutine_tikv-1.internal`].State)
	suite.Require().Equal(model.ProfileStateSkipped, profiles[`goroutine_tikv-2.internal`].State)
	suite.Require().Equal(model.ProfileStateSkipped, profiles[`mutex_tikv-1.internal`].State)
	suite.Require().Equal(model.ProfileStateSkipped, profiles[`mutex_tikv-2.internal`].State)

	// Test GetBundleData
	bundleDataResp, err := suite.backend.GetBundleData(model.GetBundleDataReq{BundleID: startResp.BundleID})
	suite.Require().NoError(err)
	suite.Require().Empty(bundleDataResp.Profiles)

	// Test GetProfileData
	_, err = suite.backend.GetProfileData(model.GetProfileDataReq{ProfileID: profiles[`goroutine_tikv-2.internal`].ProfileID})
	suite.Require().EqualError(err, "the profile is in skipped state")
}

func (suite *BackendSuite) TestAllSucceeded() {
	suite.mockTiDBTransport.RegisterResponder("GET", "http://tidb-1.internal:10080/debug/pprof/profile?seconds=20",
		httpmockutil.StringResponder(`foobar`))
	suite.mockTiDBTransport.RegisterResponder("GET", "http://tidb-2.internal:5101/debug/pprof/profile?seconds=20",
		httpmockutil.StringResponder(`box`))

	startResp, err := suite.backend.StartBundle(model.StartBundleReq{
		DurationSec: 20,
		Kinds: []profutil.ProfKind{
			profutil.ProfKindCPU,
		},
		Targets: []topo.SignedCompDesc{
			suite.mustSignDesc(topo.CompDesc{
				IP:         "tidb-1.internal",
				Port:       4000,
				StatusPort: 10080,
				Kind:       topo.KindTiDB,
			}),
			suite.mustSignDesc(topo.CompDesc{
				IP:         "tidb-2.internal",
				Port:       1051,
				StatusPort: 5101,
				Kind:       topo.KindTiDB,
			}),
		},
	})
	suite.Require().NoError(err)

	// Wait bundle task to finish
	suite.backend.bundleTaskWg.Wait()

	getResp, err := suite.backend.GetBundle(model.GetBundleReq{BundleID: startResp.BundleID})
	suite.Require().NoError(err)
	suite.Require().Equal(topo.CompCount{topo.KindTiDB: 2}, getResp.Bundle.TargetsCount)
	suite.Require().Equal(model.BundleStateAllSucceeded, getResp.Bundle.State)
	suite.Require().Len(getResp.Profiles, 2)
	profiles := mapProfilesByIPAndKind(getResp.Profiles)
	suite.Require().Equal(model.ProfileStateSucceeded, profiles[`cpu_tidb-1.internal`].State)
	suite.Require().Equal(model.ProfileStateSucceeded, profiles[`cpu_tidb-2.internal`].State)

	// Test GetBundleData
	bundleDataResp, err := suite.backend.GetBundleData(model.GetBundleDataReq{BundleID: startResp.BundleID})
	suite.Require().NoError(err)
	suite.Require().Len(bundleDataResp.Profiles, 2)
	profileData := mapProfilesDataByIPAndKind(bundleDataResp.Profiles)
	suite.Require().Equal(model.ProfileStateSucceeded, profileData[`cpu_tidb-1.internal`].State)
	suite.Require().Equal(model.ProfileStateSucceeded, profileData[`cpu_tidb-2.internal`].State)
	suite.Require().Equal("foobar", string(profileData[`cpu_tidb-1.internal`].Data))
	suite.Require().Equal("box", string(profileData[`cpu_tidb-2.internal`].Data))

	// Test GetProfileData
	profile, err := suite.backend.GetProfileData(model.GetProfileDataReq{ProfileID: profiles[`cpu_tidb-1.internal`].ProfileID})
	suite.Require().NoError(err)
	suite.Require().Equal("foobar", string(profile.Profile.Data))

	profile, err = suite.backend.GetProfileData(model.GetProfileDataReq{ProfileID: profiles[`cpu_tidb-2.internal`].ProfileID})
	suite.Require().NoError(err)
	suite.Require().Equal("box", string(profile.Profile.Data))
}

func (suite *BackendSuite) TestSomeFailedSomeSucceeded() {
	suite.mockTiDBTransport.RegisterResponder("GET", "http://tidb-1.internal:10080/debug/pprof/profile?seconds=20",
		httpmockutil.StringResponder(`foobar`))

	startResp, err := suite.backend.StartBundle(model.StartBundleReq{
		DurationSec: 20,
		Kinds: []profutil.ProfKind{
			profutil.ProfKindCPU,
		},
		Targets: []topo.SignedCompDesc{
			suite.mustSignDesc(topo.CompDesc{
				IP:         "tidb-1.internal",
				Port:       4000,
				StatusPort: 10080,
				Kind:       topo.KindTiDB,
			}),
			suite.mustSignDesc(topo.CompDesc{
				IP:         "tidb-2.internal",
				Port:       1051,
				StatusPort: 5101,
				Kind:       topo.KindTiDB,
			}),
		},
	})
	suite.Require().NoError(err)

	// Wait bundle task to finish
	suite.backend.bundleTaskWg.Wait()

	getResp, err := suite.backend.GetBundle(model.GetBundleReq{BundleID: startResp.BundleID})
	suite.Require().NoError(err)
	suite.Require().Equal(topo.CompCount{topo.KindTiDB: 2}, getResp.Bundle.TargetsCount)
	suite.Require().Equal(model.BundleStatePartialSucceeded, getResp.Bundle.State)
	suite.Require().Len(getResp.Profiles, 2)
	profiles := mapProfilesByIPAndKind(getResp.Profiles)
	suite.Require().Equal(model.ProfileStateSucceeded, profiles[`cpu_tidb-1.internal`].State)
	suite.Require().Equal(model.ProfileStateError, profiles[`cpu_tidb-2.internal`].State)
	suite.Require().Contains(profiles[`cpu_tidb-2.internal`].Error, "no responder found")

	// Test GetBundleData
	bundleDataResp, err := suite.backend.GetBundleData(model.GetBundleDataReq{BundleID: startResp.BundleID})
	suite.Require().NoError(err)
	suite.Require().Len(bundleDataResp.Profiles, 1)
	suite.Require().Equal("foobar", string(bundleDataResp.Profiles[0].Data))

	// Test GetProfileData
	profile, err := suite.backend.GetProfileData(model.GetProfileDataReq{ProfileID: profiles[`cpu_tidb-1.internal`].ProfileID})
	suite.Require().NoError(err)
	suite.Require().Equal("foobar", string(profile.Profile.Data))

	_, err = suite.backend.GetProfileData(model.GetProfileDataReq{ProfileID: profiles[`cpu_tidb-2.internal`].ProfileID})
	suite.Require().Error(err)
}

func (suite *BackendSuite) TestRunningState() {
	pdRespChan := make(chan string, 1)
	suite.mockPDTransport.RegisterResponder("GET", "http://pd-4.internal:2379/debug/pprof/profile?seconds=10",
		httpmockutil.ChanStringResponder(pdRespChan))

	tidbRespChan := make(chan string, 1)
	suite.mockTiDBTransport.RegisterResponder("GET", "http://tidb-1.internal:10080/debug/pprof/profile?seconds=10",
		httpmockutil.ChanStringResponder(tidbRespChan))

	startResp, err := suite.backend.StartBundle(model.StartBundleReq{
		DurationSec: 10,
		Kinds: []profutil.ProfKind{
			profutil.ProfKindCPU,
		},
		Targets: []topo.SignedCompDesc{
			suite.mustSignDesc(topo.CompDesc{
				IP:         "tidb-1.internal",
				Port:       4000,
				StatusPort: 10080,
				Kind:       topo.KindTiDB,
			}),
			suite.mustSignDesc(topo.CompDesc{
				IP:   "pd-4.internal",
				Port: 2379,
				Kind: topo.KindPD,
			}),
		},
	})
	suite.Require().NoError(err)

	getResp, _ := suite.backend.GetBundle(model.GetBundleReq{BundleID: startResp.BundleID})
	suite.Require().NoError(err)
	suite.Require().Equal(topo.CompCount{topo.KindTiDB: 1, topo.KindPD: 1}, getResp.Bundle.TargetsCount)
	suite.Require().Equal(model.BundleStateRunning, getResp.Bundle.State)
	suite.Require().Len(getResp.Profiles, 2)
	profiles := mapProfilesByIPAndKind(getResp.Profiles)
	suite.Require().Equal(model.ProfileStateRunning, profiles[`cpu_tidb-1.internal`].State)
	suite.Require().Equal(model.ProfileStateRunning, profiles[`cpu_pd-4.internal`].State)
	suite.Require().True(profiles[`cpu_tidb-1.internal`].Progress >= 0)
	suite.Require().True(profiles[`cpu_tidb-1.internal`].Progress < 1)
	suite.Require().True(profiles[`cpu_pd-4.internal`].Progress >= 0)
	suite.Require().True(profiles[`cpu_pd-4.internal`].Progress < 1)

	pdRespChan <- `pd profile data foo`
	time.Sleep(time.Second)

	getResp, _ = suite.backend.GetBundle(model.GetBundleReq{BundleID: startResp.BundleID})
	suite.Require().NoError(err)
	suite.Require().Equal(topo.CompCount{topo.KindTiDB: 1, topo.KindPD: 1}, getResp.Bundle.TargetsCount)
	suite.Require().Equal(model.BundleStateRunning, getResp.Bundle.State)
	suite.Require().Len(getResp.Profiles, 2)
	profiles = mapProfilesByIPAndKind(getResp.Profiles)
	suite.Require().Equal(model.ProfileStateRunning, profiles[`cpu_tidb-1.internal`].State)
	suite.Require().Equal(model.ProfileStateSucceeded, profiles[`cpu_pd-4.internal`].State)
	suite.Require().True(profiles[`cpu_tidb-1.internal`].Progress >= 0)
	suite.Require().True(profiles[`cpu_tidb-1.internal`].Progress < 1)
	suite.Require().EqualValues(1, profiles[`cpu_pd-4.internal`].Progress)

	tidbRespChan <- `tidb profile data bar`
	suite.backend.bundleTaskWg.Wait()

	getResp, _ = suite.backend.GetBundle(model.GetBundleReq{BundleID: startResp.BundleID})
	suite.Require().NoError(err)
	suite.Require().Equal(topo.CompCount{topo.KindTiDB: 1, topo.KindPD: 1}, getResp.Bundle.TargetsCount)
	suite.Require().Equal(model.BundleStateAllSucceeded, getResp.Bundle.State)
	suite.Require().Len(getResp.Profiles, 2)
	profiles = mapProfilesByIPAndKind(getResp.Profiles)
	suite.Require().Equal(model.ProfileStateSucceeded, profiles[`cpu_tidb-1.internal`].State)
	suite.Require().Equal(model.ProfileStateSucceeded, profiles[`cpu_pd-4.internal`].State)
	suite.Require().EqualValues(1, profiles[`cpu_tidb-1.internal`].Progress)
	suite.Require().EqualValues(1, profiles[`cpu_pd-4.internal`].Progress)
}

func TestNewStandardBackend(t *testing.T) {
	suite.Run(t, new(BackendSuite))
}
